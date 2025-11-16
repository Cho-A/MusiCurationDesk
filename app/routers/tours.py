from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models , schemas # 先ほど作成したファイルをインポート

router = APIRouter(
    prefix="/tours", 
    tags=["Tours"] 
)


# --- ★ツアー登録APIエンドポイント★ ---
#
# [POST] /tours/
# ----------------------------------------------------
@router.post("/tours/", response_model=schemas.Tour, tags=["Tours"])
def create_tour(
    tour: schemas.TourCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいツアーのマスターデータ（例: ツアー名）をデータベースに登録します。
    """
    
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