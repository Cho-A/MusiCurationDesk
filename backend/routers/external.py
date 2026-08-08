from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Any

from .. import models, schemas, dependencies
from ..services.spotify_client import SpotifyClient
from ..services.setlistfm_client import SetlistFMClient
import datetime

router = APIRouter(
    prefix="/external",
    tags=["External APIs"],
    dependencies=[Depends(dependencies.get_current_admin_user)]
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
        db_album_group = db.query(models.AlbumGroup).filter(
            func.lower(models.AlbumGroup.title) == func.lower(album_name)
        ).first()
        
        album_images = track['album'].get('images', [])
        cover_url = album_images[0]['url'] if album_images else None
        
        if not db_album_group:
            db_album_group = models.AlbumGroup(title=album_name, artist_id=db_artist.id, cover_image_url=cover_url)
            db.add(db_album_group)
            db.commit()
            db.refresh(db_album_group)

        db_album = db.query(models.Album).filter(
            func.lower(models.Album.main_title) == func.lower(album_name)
        ).first()

        if not db_album:
            db_album = models.Album(
                main_title=album_name, 
                cover_image_url=cover_url,
                album_group_id=db_album_group.id,
                artist_id=db_artist.id
            )
            db.add(db_album)
            db.commit()
            db.refresh(db_album)
        elif cover_url and not db_album.cover_image_url:
            # 既存のアルバムに画像がなければ更新
            db_album.cover_image_url = cover_url
            db.commit()
            db.refresh(db_album)
            
        if db_album.album_group_id is None:
            db_album.album_group_id = db_album_group.id
            db.commit()
            
        # 4. 楽曲の登録 (簡易的な重複チェック: 同名楽曲があるか)
        db_song = db.query(models.Song).filter(
            func.lower(models.Song.title) == func.lower(track_name)
        ).first()
        
        if not db_song:
            db_song = models.Song(
                title=track_name, 
                spotify_song_id=track['id'],
                is_streaming_available=track.get('is_playable', True)
            )
            db.add(db_song)
            db.commit()
            db.refresh(db_song)
            
            # リレーション (Song - Artist)
            link = models.SongArtistLink(
                song_id=db_song.id,
                artist_id=db_artist.id,
                role_category="Artist"
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


class BulkImportRequest(BaseModel):
    setlist_ids: List[str]

class FullSyncRequest(BaseModel):
    artist_name: str
    artist_mbid: str = None

@router.post("/setlistfm/bulk-import")
def bulk_import_setlists(req: BulkImportRequest, db: Session = Depends(models.get_db)):
    errors = []
    successes = []
    
    # 1. Fetch data concurrently
    setlist_data_results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(setlistfm_client.get_setlist, sid): sid for sid in req.setlist_ids}
        for future in futures:
            sid = futures[future]
            try:
                data = future.result()
                setlist_data_results.append((sid, data))
            except Exception as e:
                errors.append(f"Failed to fetch {sid}: {str(e)}")
                
    # 2. Insert sequentially to DB
    for sid, data in setlist_data_results:
        try:
            perf_id = _insert_setlist_data(data, sid, db)
            successes.append({"setlist_id": sid, "performance_id": perf_id})
        except Exception as e:
            errors.append(f"Failed to insert {sid}: {str(e)}")
            
    if errors:
        return {"message": "Bulk import completed with some errors", "successes": successes, "errors": errors}
        
    return {"message": "Bulk import completed", "successes": successes}

@router.post("/setlistfm/full-sync-artist")
def full_sync_artist(req: FullSyncRequest, db: Session = Depends(models.get_db)):
    try:
        first_page = setlistfm_client.search_setlists(req.artist_name, 1, req.artist_mbid)
        if not first_page.get("setlist"):
            return {"message": "No setlists found", "successes": [], "errors": []}
            
        total_items = first_page.get("total", 0)
        items_per_page = first_page.get("itemsPerPage", 20)
        import math
        total_pages = math.ceil(total_items / items_per_page)
        
        all_setlists = first_page["setlist"]
        
        def fetch_page(p: int):
            import time
            time.sleep(0.5)
            data = setlistfm_client.search_setlists(req.artist_name, p, req.artist_mbid)
            return data.get("setlist", [])

        if total_pages > 1:
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(fetch_page, p) for p in range(2, total_pages + 1)]
                for future in futures:
                    try:
                        all_setlists.extend(future.result())
                    except Exception as e:
                        print(f"Error fetching page: {e}")
                        
        successes = []
        errors = []
        for sl_data in all_setlists:
            sid = sl_data.get("id")
            try:
                perf_id = _insert_setlist_data(sl_data, sid, db)
                successes.append({"setlist_id": sid, "performance_id": perf_id})
            except Exception as e:
                errors.append(f"Failed to insert {sid}: {str(e)}")
                
        return {"message": "Full sync completed", "successes": successes, "errors": errors, "total_found": len(all_setlists)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/setlistfm/import")
def import_setlistfm(req: SetlistImportRequest, db: Session = Depends(models.get_db)):
    try:
        data = setlistfm_client.get_setlist(req.setlist_id)
        perf_id = _insert_setlist_data(data, req.setlist_id, db)
        return {"message": "Success", "performance_id": perf_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _core_import_setlistfm(setlist_id: str, db: Session) -> int:
    # Retained for backwards compatibility if needed elsewhere
    setlist_data = setlistfm_client.get_setlist(setlist_id)
    return _insert_setlist_data(setlist_data, setlist_id, db)

def _insert_setlist_data(setlist_data: dict, setlist_id: str, db: Session) -> int:
    
    artist_name = setlist_data.get("artist", {}).get("name")
    date_str = setlist_data.get("eventDate")
    tour_dict = setlist_data.get("tour") or {}
    tour_name = tour_dict.get("name")
    venue_dict = setlist_data.get("venue") or {}
    venue_name = venue_dict.get("name")
    venue_city = venue_dict.get("city", {}).get("name")
    
    artist = db.query(models.Artist).filter(models.Artist.name == artist_name).first()
    if not artist:
        artist = models.Artist(name=artist_name)
        db.add(artist)
        db.commit()
        db.refresh(artist)

    venue = None
    if venue_name:
        venue = db.query(models.Venue).filter(models.Venue.name == venue_name).first()
        if not venue:
            venue = models.Venue(name=venue_name, prefecture=venue_city)
            db.add(venue)
            db.commit()
            db.refresh(venue)

    tour = None
    if tour_name:
        tour = db.query(models.Tour).filter(models.Tour.name == tour_name).first()
        if not tour:
            tour = models.Tour(name=tour_name)
            db.add(tour)
            db.commit()
            db.refresh(tour)
            
    event_date = None
    if date_str:
        try:
            day, month, year = date_str.split("-")
            event_date = datetime.date(int(year), int(month), int(day))
        except:
            pass
            
    performance_name = tour_name if tour_name else f"{artist_name} Live at {venue_name}"
    
    # 既存チェック (重複を防ぐため、同日・同名・同アーティストならスキップ)
    existing_perf = db.query(models.Performance).filter(
        models.Performance.name == performance_name,
        models.Performance.date == event_date,
        models.Performance.artist_id == artist.id
    ).first()
    
    if existing_perf:
        # 重複の場合は既存のIDを返し、セットリストの上書きは行わない
        return existing_perf.id

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

    sets = setlist_data.get("sets", {}).get("set", [])
    order_index = 1
    
    for s in sets:
        is_encore = "encore" in s
        encore_text = f"Encore {s['encore']}" if is_encore else ""
        
        for track in s.get("song", []):
            song_name_en = track.get("name")
            if not song_name_en:
                continue
                
            db_song = db.query(models.Song).filter(models.Song.title == song_name_en).first()
            if not db_song:
                alias = db.query(models.SongAlias).filter(models.SongAlias.alias_name == song_name_en).first()
                if alias:
                    db_song = alias.song
                    
            if not db_song:
                try:
                    search_q = f"track:{song_name_en} artist:{artist_name}"
                    spotify_results = spotify_client.search_tracks(search_q, limit=1)
                    if spotify_results:
                        spotify_id = spotify_results[0]['id']
                        local_name = spotify_results[0]['name']
                        
                        db_song = db.query(models.Song).filter(models.Song.spotify_song_id == spotify_id).first()
                        if not db_song:
                            db_song = db.query(models.Song).filter(models.Song.title == local_name).first()
                            
                        if db_song:
                            new_alias = models.SongAlias(song_id=db_song.id, alias_name=song_name_en)
                            db.add(new_alias)
                except Exception as e:
                    pass
            
            # Build notes
            notes_parts = []
            info = track.get("info")
            if is_encore and info:
                notes_parts = [encore_text, info]
            elif is_encore:
                notes_parts = [encore_text]
            elif info:
                notes_parts = [info]

            notes_str = " - ".join(notes_parts) if notes_parts else None
            
            entry = models.SetlistEntry(
                performance_id=perf.id,
                song_id=db_song.id if db_song else None,
                entry_type="SONG",
                unresolved_song_name=song_name_en,
                order_index=order_index,
                notes=notes_str
            )
            db.add(entry)
            order_index += 1
            
    db.commit()
    return perf.id
