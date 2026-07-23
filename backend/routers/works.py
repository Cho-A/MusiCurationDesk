from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas

router = APIRouter(
    prefix="/works",
    tags=["MusicalWorks"]
)

@router.get("/", response_model=list[schemas.MusicalWork])
def search_works(
    q: str | None = Query(None, description="楽曲名検索キーワード"),
    limit: int = 50,
    db: Session = Depends(models.get_db)
):
    """
    抽象的な楽曲 (MusicalWork) の一覧・検索を行います。
    """
    query = db.query(models.MusicalWork).options(
        joinedload(models.MusicalWork.artist_links).joinedload(models.WorkArtistLink.artist)
    )
    if q:
        query = query.filter(models.MusicalWork.title.ilike(f"%{q}%"))
    return query.limit(limit).all()

@router.post("/", response_model=schemas.MusicalWork)
def create_work(
    work: schemas.MusicalWorkBase,
    db: Session = Depends(models.get_db)
):
    """
    新しい楽曲 (MusicalWork) を作成します。
    """
    new_work = models.MusicalWork(
        title=work.title,
        jasrac_code=work.jasrac_code,
        iswc_code=work.iswc_code
    )
    db.add(new_work)
    try:
        db.commit()
        db.refresh(new_work)
        return new_work
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"登録エラー: {e}")

@router.put("/{work_id}", response_model=schemas.MusicalWork)
def update_work(
    work_id: int,
    work: schemas.MusicalWorkBase,
    db: Session = Depends(models.get_db)
):
    """
    Work情報を更新します。
    """
    db_work = db.query(models.MusicalWork).filter(models.MusicalWork.id == work_id).first()
    if db_work is None:
        raise HTTPException(status_code=404, detail="Work not found")

    db_work.title = work.title
    db_work.jasrac_code = work.jasrac_code
    db_work.iswc_code = work.iswc_code

    db.commit()
    db.refresh(db_work)
    return db_work
