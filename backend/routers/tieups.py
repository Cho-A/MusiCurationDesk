from __future__ import annotations
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from .. import models, schemas

router = APIRouter(
    prefix="/tieups",
    tags=["Tieups"]
)

@router.post("/", response_model=schemas.Tieup)
def create_tieup(tieup: schemas.TieupCreate, db: Session = Depends(models.get_db)):
    db_tieup = models.Tieup(**tieup.dict())
    db.add(db_tieup)
    db.commit()
    db.refresh(db_tieup)
    return db_tieup

@router.get("/", response_model=List[schemas.Tieup])
def get_tieups(db: Session = Depends(models.get_db)):
    return db.query(models.Tieup).all()

@router.get("/{tieup_id}", response_model=schemas.TieupDetail)
def get_tieup(tieup_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDのタイアップ詳細を取得します。
    親のパンくずリスト（parents）と、直接の子（children）を含みます。
    """
    db_tieup = db.query(models.Tieup).filter(models.Tieup.id == tieup_id).first()
    if not db_tieup:
        raise HTTPException(status_code=404, detail="タイアップが見つかりません。")
        
    # 親を辿ってパンくずリストを構築
    parents = []
    current = db_tieup.parent
    while current:
        parents.insert(0, schemas.TieupHierarchyNode(
            id=current.id, 
            name=current.name, 
            category=current.category
        ))
        current = current.parent
        
    return schemas.TieupDetail(
        id=db_tieup.id,
        name=db_tieup.name,
        category=db_tieup.category,
        parent_id=db_tieup.parent_id,
        children=db_tieup.children,
        parents=parents
    )

@router.get("/{tieup_id}/songs", response_model=List[schemas.Song])
def get_tieup_songs(tieup_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたタイアップ、およびその子孫（階層下）に紐づくすべての楽曲を取得します。
    """
    # 1. 階層下の全Tieup IDを再帰的に取得
    def get_all_descendant_ids(t_id: int) -> List[int]:
        ids = [t_id]
        children = db.query(models.Tieup.id).filter(models.Tieup.parent_id == t_id).all()
        for child in children:
            ids.extend(get_all_descendant_ids(child.id))
        return ids
        
    target_tieup_ids = get_all_descendant_ids(tieup_id)
    
    # 2. それらのTieupに紐づく楽曲を取得
    # joinで結びつけ、distinctで重複を排除
    songs = db.query(models.Song)\
        .join(models.SongTieupLink, models.Song.id == models.SongTieupLink.song_id)\
        .filter(models.SongTieupLink.tieup_id.in_(target_tieup_ids))\
        .distinct()\
        .all()
        
    return songs
