from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models , schemas # 先ほど作成したファイルをインポート

router = APIRouter(
    prefix="/tieups", 
    tags=["Tieups"] 
)


# [POST] /tieups/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Tieup, tags=["Tieups"])
def create_tieup(
    tieup: schemas.TieupCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいタイアップ先（例: アニメ作品名、ゲーム名）をデータベースに登録します。
    
    - **name**: タイアップ先の名前 (必須)
    - **category**: 分類 (任意 "Anime", "Game", "CM" など)
    """
    
    # 既に同じ名前のタイアップ先がないかチェック (任意)
    db_tieup = db.query(models.Tieup).filter(models.Tieup.name == tieup.name).first()
    if db_tieup:
        raise HTTPException(status_code=400, detail=f"タイアップ名 '{tieup.name}' は既に使用されています。")
    
    # 1. 受け取ったデータ (tieup) を、DBモデル (models.Tieup) に変換
    new_tieup = models.Tieup(
        name=tieup.name,
        category=tieup.category
    )
    
    db.add(new_tieup)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_tieup)
    
    return new_tieup
