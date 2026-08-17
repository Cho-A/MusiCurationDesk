from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.dependencies import get_db

from .. import models, schemas

router = APIRouter(
    prefix="/tours",
    tags=["Tours"],
)


# --- ★ツアー登録APIエンドポイント★ ---
#
# [POST] /tours/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Tour, tags=["Tours"])
def create_tour(
    tour: schemas.TourCreate,
    db: Session = Depends(get_db),
):
    """新しいツアーのマスターデータ（例: ツアー名）をデータベースに登録します。"""
    # 既に同じ名前のツアーがないかチェック (名前の重複は防ぐ)
    db_tour = db.query(models.Tour).filter(models.Tour.name == tour.name).first()
    if db_tour:
        raise HTTPException(status_code=400, detail=f"ツアー名 '{tour.name}' は既に使用されています。")

    # 1. データ作成
    new_tour = models.Tour(name=tour.name)

    db.add(new_tour)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_tour)

    return new_tour


@router.get("/", response_model=List[schemas.Tour], tags=["Tours"])
def get_tours(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """登録されているすべてのツアー/イベントシリーズ一覧を取得します。"""
    tours = db.query(models.Tour).order_by(models.Tour.id.desc()).offset(skip).limit(limit).all()
    return tours


@router.get("/{tour_id}", response_model=schemas.TourDetail, tags=["Tours"])
def get_tour(tour_id: int, db: Session = Depends(get_db)):
    """指定されたIDのツアー/イベントシリーズ詳細と、関連する公演一覧を取得します。"""
    from sqlalchemy.orm import joinedload

    tour = (
        db.query(models.Tour)
        .options(
            joinedload(models.Tour.performances).joinedload(models.Performance.venue),
            joinedload(models.Tour.performances).joinedload(models.Performance.main_artist),
        )
        .filter(models.Tour.id == tour_id)
        .first()
    )
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    # 日付でソート
    tour.performances.sort(key=lambda p: p.date)
    return tour
