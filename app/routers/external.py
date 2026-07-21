from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Any

from .. import models, schemas
from ..services.spotify_client import SpotifyClient
from ..services.setlistfm_client import SetlistFMClient
import datetime

router = APIRouter(
    prefix="/external",
    tags=["External APIs"],
)

# Spotifyクライアントのインスタンス化 (本番環境ではDIを推奨しますが、今はモジュールレベルで保持)
spotify_client = SpotifyClient()
setlistfm_client = SetlistFMClient()

class SpotifyTrackResult(BaseModel):
    spotify_id: str
    title: str
    artist_name: str
    album_name: str
    image_url: str | None = None

class ImportRequest(BaseModel):
    spotify_track_id: str

@router.get("/spotify/search", response_model=List[SpotifyTrackResult])
def search_spotify_tracks(q: str):
    """Spotify APIを使って楽曲を検索する"""
    if not q:
        return []
    
    try:
        results = spotify_client.search_tracks(query=q, limit=10)
        tracks = []
        for item in results:
            # 最初のアーティストを取得
            artist_name = item['artists'][0]['name'] if item['artists'] else "Unknown Artist"
            album_name = item['album']['name']
            
            # アルバムアートワーク (中サイズ) を取得
            images = item['album'].get('images', [])
            image_url = images[1]['url'] if len(images) > 1 else (images[0]['url'] if images else None)
            
            tracks.append(SpotifyTrackResult(
                spotify_id=item['id'],
                title=item['name'],
                artist_name=artist_name,
                album_name=album_name,
                image_url=image_url
            ))
        return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spotify Search Failed: {str(e)}")


@router.post("/spotify/import")
def import_spotify_track(req: ImportRequest, db: Session = Depends(models.get_db)):
    """SpotifyのTrack IDを元に、楽曲・アーティスト・アルバムをDBに自動登録する"""
    try:
        # 1. Spotifyから詳細情報を取得
        track = spotify_client.get_track(req.spotify_track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found on Spotify")
            
        track_name = track['name']
        artist_name = track['artists'][0]['name'] if track['artists'] else "Unknown Artist"
        album_name = track['album']['name']
        
        # 2. アーティストの登録 (大文字小文字区別なし検索)
        db_artist = db.query(models.Artist).filter(
            func.lower(models.Artist.name) == func.lower(artist_name)
        ).first()
        
        if not db_artist:
            db_artist = models.Artist(name=artist_name)
            db.add(db_artist)
            db.commit()
            db.refresh(db_artist)
            
        # 3. アルバムの登録 (大文字小文字区別なし検索)
        db_album = db.query(models.Album).filter(
            func.lower(models.Album.main_title) == func.lower(album_name)
        ).first()
        
        album_images = track['album'].get('images', [])
        cover_url = album_images[0]['url'] if album_images else None

        if not db_album:
            db_album = models.Album(main_title=album_name, cover_image_url=cover_url)
            db.add(db_album)
            db.commit()
            db.refresh(db_album)
        elif cover_url and not db_album.cover_image_url:
            # 既存のアルバムに画像がなければ更新
            db_album.cover_image_url = cover_url
            db.commit()
            db.refresh(db_album)
            
        # 4. 楽曲の登録 (簡易的な重複チェック: 同名楽曲があるか)
        db_song = db.query(models.Song).filter(
            func.lower(models.Song.title) == func.lower(track_name)
        ).first()
        
        if not db_song:
            db_song = models.Song(title=track_name)
            db.add(db_song)
            db.commit()
            db.refresh(db_song)
            
            # リレーション (Song - Artist)
            link = models.SongArtistLink(
                song_id=db_song.id,
                artist_id=db_artist.id,
                role_category="Main Artist"
            )
            db.add(link)
            
            # リレーション (Album - Track)
            album_track = models.AlbumTrack(
                album_id=db_album.id,
                song_id=db_song.id,
                disc_number=track.get('disc_number', 1),
                track_number=track.get('track_number', 1)
            )
            db.add(album_track)
            
            db.commit()
            return {"status": "success", "message": f"Imported '{track_name}' successfully.", "song_id": db_song.id}
        else:
            return {"status": "skipped", "message": f"'{track_name}' already exists in database.", "song_id": db_song.id}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import Failed: {str(e)}")

# --- Setlist.fm Integration ---

@router.get("/setlistfm/search")
def search_setlistfm(artist_name: str, p: int = 1):
    try:
        data = setlistfm_client.search_setlists(artist_name, p)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SetlistImportRequest(BaseModel):
    setlist_id: str

@router.post("/setlistfm/import")
def import_setlistfm(req: SetlistImportRequest, db: Session = Depends(models.get_db)):
    try:
        setlist_data = setlistfm_client.get_setlist(req.setlist_id)
        
        # Extract basic info
        artist_name = setlist_data.get("artist", {}).get("name")
        date_str = setlist_data.get("eventDate") # format: dd-MM-yyyy
        tour_name = setlist_data.get("tour", {}).get("name")
        venue_name = setlist_data.get("venue", {}).get("name")
        venue_city = setlist_data.get("venue", {}).get("city", {}).get("name")
        
        # 1. Find or create Artist
        artist = db.query(models.Artist).filter(models.Artist.name == artist_name).first()
        if not artist:
            artist = models.Artist(name=artist_name)
            db.add(artist)
            db.commit()
            db.refresh(artist)

        # 2. Find or create Venue
        venue = None
        if venue_name:
            venue = db.query(models.Venue).filter(models.Venue.name == venue_name).first()
            if not venue:
                venue = models.Venue(name=venue_name, prefecture=venue_city)
                db.add(venue)
                db.commit()
                db.refresh(venue)

        # 3. Find or create Tour
        tour = None
        if tour_name:
            tour = db.query(models.Tour).filter(models.Tour.name == tour_name).first()
            if not tour:
                tour = models.Tour(name=tour_name, main_artist_id=artist.id)
                db.add(tour)
                db.commit()
                db.refresh(tour)
        
        # Parse date
        event_date = None
        if date_str:
            try:
                # setlist.fm date format is dd-MM-yyyy
                day, month, year = date_str.split("-")
                event_date = datetime.date(int(year), int(month), int(day))
            except:
                pass
        
        # 4. Create Performance
        performance_name = tour_name if tour_name else f"{artist_name} Live at {venue_name}"
        perf = models.Performance(
            name=performance_name,
            date=event_date,
            venue_id=venue.id if venue else None,
            tour_id=tour.id if tour else None,
            artist_id=artist.id,
            performance_type="Tour" if tour else "Live",
            event_type="Live"
        )
        db.add(perf)
        db.commit()
        db.refresh(perf)

        # 5. Extract sets (For now, we just create empty setlists because matching songs requires complex logic, 
        #    but we can at least create the PerformanceSetlist entries if we had song IDs.
        #    Wait, we don't have Song IDs, but we can search for them by name. Let's just create the performance for now.)
        
        # To do: add setlist tracks. For now just returning the performance ID.
        return {"message": "Success", "performance_id": perf.id}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
