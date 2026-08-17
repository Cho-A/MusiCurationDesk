from __future__ import annotations

import traceback
import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from .. import dependencies, models
from ..services import musicbrainz_fetcher
from ..services.credit_fetcher import MusicImporter

router = APIRouter(
    prefix="/musicbrainz", tags=["musicbrainz"], dependencies=[Depends(dependencies.get_current_admin_user)]
)


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


class MBBulkImportRequest(BaseModel):
    release_ids: List[str]


mb_import_jobs = {}


def update_mb_job_progress(job_id: str, status: str, progress: int, message: str = ""):
    if job_id in mb_import_jobs:
        mb_import_jobs[job_id].update({"status": status, "progress": progress, "message": message})


def background_import_mb_bulk(job_id: str, release_ids: List[str]):
    db = models.SessionLocal()
    try:
        update_mb_job_progress(job_id, "running", 5, "Initializing MB bulk import...")
        importer = MusicImporter()

        def progress_cb(prog: int, msg: str):
            update_mb_job_progress(job_id, "running", prog, msg)

        result = importer.import_mb_releases_bulk(release_ids, db, progress_callback=progress_cb)
        update_mb_job_progress(
            job_id,
            "completed",
            100,
            f"Imported {result['imported_albums']} albums and {result['imported_tracks']} tracks.",
        )
    except Exception as e:
        update_mb_job_progress(job_id, "failed", 0, f"Error: {str(e)}")
    finally:
        db.close()


@router.post("/import/bulk")
def import_mb_releases_bulk(request: MBBulkImportRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    mb_import_jobs[job_id] = {"status": "queued", "progress": 0, "message": "Queued"}
    background_tasks.add_task(background_import_mb_bulk, job_id, request.release_ids)
    return {"job_id": job_id, "message": "MB bulk import started"}


@router.get("/import/bulk/progress/{job_id}")
def get_mb_import_progress(job_id: str):
    if job_id not in mb_import_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return mb_import_jobs[job_id]
