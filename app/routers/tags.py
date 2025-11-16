from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

router = APIRouter(
    prefix="/tags", 
    tags=["Tags"] 
)

# --- ★タグマスター登録APIエンドポイント★ ---
#
# [POST] /tags/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Tag, tags=["Tags"])
def create_tag(
    tag: schemas.TagCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいタグ（例: "バラード", "ライブ定番曲"）をデータベースに登録します。
    """
    
    # 既に同じ名前のタグがないかチェック (タグ名はUNIQUE制約)
    db_tag = db.query(models.Tag).filter(models.Tag.name == tag.name).first()
    if db_tag:
        raise HTTPException(status_code=400, detail=f"タグ名 '{tag.name}' は既に使用されています。")
    
    # 1. データ作成
    new_tag = models.Tag(**tag.dict())
    
    db.add(new_tag)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_tag)
    
    return new_tag