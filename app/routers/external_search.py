from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from .. import models
from ..services.spotify_client import SpotifyClient
from ..services.credit_fetcher import MusicImporter
from typing import List, Dict, Any

router = APIRouter(
    prefix="/search/external",
    tags=["External Search"]
)

spotify_client = SpotifyClient()

@router.get("/artists")
def search_artists(q: str = Query(..., description="Artist name query"), limit: int = Query(10, le=50)):
    """Spotifyからアーティストを検索し、サジェスト用に整形して返す"""
    try:
        artists = spotify_client.search_artists(q, limit=limit)
        result = []
        for a in artists:
            image_url = a['images'][0]['url'] if a['images'] else None
            result.append({
                "spotify_artist_id": a['id'],
                "name": a['name'],
                "image_url": image_url,
                "genres": a['genres']
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spotify API Error: {str(e)}")

@router.get("/tracks")
def search_tracks(q: str = Query(..., description="Track name query"), limit: int = Query(10, le=50)):
    """Spotifyから楽曲を検索し、サジェスト用に整形して返す"""
    try:
        tracks = spotify_client.search_tracks(q, limit=limit)
        result = []
        for t in tracks:
            album_image = t['album']['images'][0]['url'] if t['album']['images'] else None
            result.append({
                "spotify_song_id": t['id'],
                "title": t['name'],
                "artist_names": [a['name'] for a in t['artists']],
                "album_name": t['album']['name'],
                "release_date": t['album']['release_date'],
                "image_url": album_image
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spotify API Error: {str(e)}")

@router.post("/import/track/{spotify_song_id}")
def import_track(spotify_song_id: str, db: Session = Depends(models.get_db)):
    """SpotifyのトラックIDを指定してDBにインポートする。MusicBrainzからクレジットも自動取得する。"""
    try:
        importer = MusicImporter()
        new_song = importer.import_track_from_spotify(spotify_song_id, db)
        return {"status": "success", "song_id": new_song.id, "title": new_song.title}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import Error: {str(e)}")
