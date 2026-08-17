from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.dependencies import get_db

from .. import models, schemas

router = APIRouter(prefix="/venues", tags=["Venues"])


@router.post("/", response_model=schemas.Venue)
def create_venue(venue: schemas.VenueCreate, db: Session = Depends(get_db)):
    db_venue = models.Venue(**venue.model_dump())
    db.add(db_venue)
    try:
        db.commit()
        db.refresh(db_venue)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_venue


@router.get("/", response_model=List[schemas.Venue])
def get_venues(db: Session = Depends(get_db)):
    return db.query(models.Venue).order_by(models.Venue.id).all()


@router.get("/{venue_id}", response_model=schemas.Venue)
def get_venue(venue_id: int, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue
