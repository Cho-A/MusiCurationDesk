from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Any

from .. import models, schemas
from ..services.spotify_client import SpotifyClient

router = APIRouter(
    prefix="/external",
    tags=["External APIs"],
)

# Spotifyクライアントのインスタンス化 (本番環境ではDIを推奨しますが、今はモジュールレベルで保持)
spotify_client = SpotifyClient()

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
