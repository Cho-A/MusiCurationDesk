from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from .. import models
from ..services.spotify_client import SpotifyClient
from ..services.credit_fetcher import MusicImporter
from typing import List, Dict, Any
import uuid

from .. import models, dependencies

router = APIRouter(
    prefix="/search/external",
    tags=["External Search"],
    dependencies=[Depends(dependencies.get_current_admin_user)]
)

spotify_client = SpotifyClient()

# 簡易的なインメモリジョブ管理
import_jobs = {}

def update_job_progress(job_id: str, status: str, progress: int, message: str = ""):
    if job_id in import_jobs:
        import_jobs[job_id].update({"status": status, "progress": progress, "message": message})

@router.get("/import/progress/{job_id}")
def get_import_progress(job_id: str):
    if job_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return import_jobs[job_id]

def background_import_artist(job_id: str, spotify_artist_id: str):
    # 背景タスク専用の新しいDBセッションを開く
    db = models.SessionLocal()
    try:
        update_job_progress(job_id, "running", 5, "Initializing artist import...")
        importer = MusicImporter()
        
        # コールバック関数を渡して進捗を更新させる
        def progress_cb(prog: int, msg: str):
            update_job_progress(job_id, "running", prog, msg)
            
        result = importer.import_artist_bulk(spotify_artist_id, db, progress_callback=progress_cb)
        update_job_progress(job_id, "completed", 100, f"Imported {result['imported_albums']} albums and {result['imported_tracks']} tracks.")
    except Exception as e:
        update_job_progress(job_id, "failed", 0, f"Error: {str(e)}")
    finally:
        db.close()

def background_import_playlist(job_id: str, spotify_playlist_id: str):
    db = models.SessionLocal()
    try:
        update_job_progress(job_id, "running", 5, "Initializing playlist import...")
        importer = MusicImporter()
        
        def progress_cb(prog: int, msg: str):
            update_job_progress(job_id, "running", prog, msg)
            
        result = importer.import_playlist_bulk(spotify_playlist_id, db, progress_callback=progress_cb)
        update_job_progress(job_id, "completed", 100, f"Imported {result['imported_artists']} artists and {result['imported_tracks']} tracks.")
    except Exception as e:
        update_job_progress(job_id, "failed", 0, f"Error: {str(e)}")
    finally:
        db.close()


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

@router.post("/import/artist/{spotify_artist_id}")
def import_artist_bulk(spotify_artist_id: str, background_tasks: BackgroundTasks):
    """SpotifyのアーティストIDを指定して、関連する全アルバムと全楽曲を非同期で一括インポートする。"""
    job_id = str(uuid.uuid4())
    import_jobs[job_id] = {"status": "queued", "progress": 0, "message": "Queued", "type": "artist"}
    
    background_tasks.add_task(background_import_artist, job_id, spotify_artist_id)
    return {"status": "accepted", "job_id": job_id}

@router.post("/import/playlist/{spotify_playlist_id}")
def import_playlist_bulk(spotify_playlist_id: str, background_tasks: BackgroundTasks):
    """SpotifyのプレイリストIDを指定して、参加アーティスト全員の全楽曲を非同期で一括インポートする。"""
    job_id = str(uuid.uuid4())
    import_jobs[job_id] = {"status": "queued", "progress": 0, "message": "Queued", "type": "playlist"}
    
    background_tasks.add_task(background_import_playlist, job_id, spotify_playlist_id)
    return {"status": "accepted", "job_id": job_id}
