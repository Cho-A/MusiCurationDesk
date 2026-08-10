from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas

router = APIRouter(
    prefix="/works",
    tags=["MusicalWorks"]
)

@router.get("/", response_model=List[schemas.MusicalWork])
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

# --- ★★★ クレジット (WorkArtistLink) 追加・削除 API ★★★ ---
#
# [POST] /works/{work_id}/artists
# ----------------------------------------------------
@router.post("/{work_id}/artists", response_model=schemas.WorkArtistLink, tags=["MusicalWorks", "Artists"])
def add_credit_to_work(
    work_id: int,
    link: schemas.WorkArtistLinkCreate,
    db: Session = Depends(models.get_db)
):
    """
    楽曲(Work)にアーティストのクレジット（役割）を追加します。
    """
    if work_id != link.work_id:
        raise HTTPException(status_code=400, detail="URLのwork_idとリクエストボディのwork_idが一致しません。")
        
    db_work = db.query(models.MusicalWork).filter(models.MusicalWork.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="楽曲(Work)が見つかりません。")
        
    new_link = models.WorkArtistLink(**link.dict())
    db.add(new_link)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー (既に同じ役割で登録されている可能性があります): {e}")

    db.refresh(new_link)
    return new_link

# [DELETE] /works/{work_id}/artists/{artist_id}
# ----------------------------------------------------
@router.delete("/{work_id}/artists/{artist_id}", status_code=204, tags=["MusicalWorks", "Artists"])
def remove_credit_from_work(
    work_id: int,
    artist_id: int,
    role_category: str = Query(..., description="削除する役割の大分類"),
    role_detail: str | None = Query(None, description="削除する役割の詳細"),
    db: Session = Depends(models.get_db)
):
    """
    楽曲(Work)から特定のクレジット（役割）を削除します。
    """
    query = db.query(models.WorkArtistLink).filter(
        models.WorkArtistLink.work_id == work_id,
        models.WorkArtistLink.artist_id == artist_id,
        models.WorkArtistLink.role_category == role_category
    )
    if role_detail:
        query = query.filter(models.WorkArtistLink.role_detail == role_detail)
    else:
        query = query.filter((models.WorkArtistLink.role_detail == None) | (models.WorkArtistLink.role_detail == ""))
        
    db_link = query.first()
    
    if not db_link:
        raise HTTPException(status_code=404, detail="指定されたクレジット情報が見つかりません。")
        
    db.delete(db_link)
    db.commit()
    return None
