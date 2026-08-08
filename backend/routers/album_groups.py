from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from backend import models, schemas
from backend.models import get_db

router = APIRouter(prefix="/album-groups", tags=["AlbumGroups"])

@router.get("/", response_model=List[schemas.AlbumGroup])
def list_album_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    artist_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.AlbumGroup)
    if artist_id is not None:
        query = query.filter(models.AlbumGroup.artist_id == artist_id)
    if q:
        query = query.filter(models.AlbumGroup.title.ilike(f"%{q}%"))
    
    # Sort by release date descending
    query = query.order_by(models.AlbumGroup.release_date.desc().nullslast())
    
    return query.offset(skip).limit(limit).all()

@router.get("/{group_id}", response_model=schemas.AlbumGroupDetail)
def get_album_group_detail(group_id: int, db: Session = Depends(get_db)):
    # We need to eagerly load artist, albums, albums.artist, albums.discs, albums.album_tracks, albums.album_tracks.song
    group = db.query(models.AlbumGroup)\
        .options(
            joinedload(models.AlbumGroup.artist),
            joinedload(models.AlbumGroup.albums).joinedload(models.Album.artist),
            joinedload(models.AlbumGroup.albums).joinedload(models.Album.discs),
            joinedload(models.AlbumGroup.albums).joinedload(models.Album.album_tracks).joinedload(models.AlbumTrack.song)
        )\
        .filter(models.AlbumGroup.id == group_id)\
        .first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Album group not found")
        
    return group

@router.post("/", response_model=schemas.AlbumGroup)
def create_album_group(group: schemas.AlbumGroupCreate, db: Session = Depends(get_db)):
    # .dict() for pydantic v1 compatibility which is likely what the project uses
    db_group = models.AlbumGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.put("/{group_id}", response_model=schemas.AlbumGroup)
def update_album_group(group_id: int, group_update: schemas.AlbumGroupUpdate, db: Session = Depends(get_db)):
    db_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Album group not found")
        
    update_data = group_update.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_group, k, v)
        
    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/{group_id}")
def delete_album_group(group_id: int, db: Session = Depends(get_db)):
    db_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Album group not found")
        
    db.delete(db_group)
    db.commit()
    return {"ok": True}
