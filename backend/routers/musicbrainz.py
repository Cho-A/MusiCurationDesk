from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services import musicbrainz_fetcher
import traceback

router = APIRouter(prefix="/musicbrainz", tags=["musicbrainz"])

@router.get("/search")
def search_mb_release(q: str, limit: int = 10):
    try:
        return musicbrainz_fetcher.search_releases(q, limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"MusicBrainz search failed: {e}")

@router.get("/releases/{release_id}")
def get_mb_release(release_id: str):
    try:
        return musicbrainz_fetcher.get_release_details(release_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"MusicBrainz release fetch failed: {e}")
