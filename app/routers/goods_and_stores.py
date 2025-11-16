from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

merchandise_router = APIRouter(
    prefix="/merchandises", 
    tags=["Goods & Stores"] 
)

stores_router = APIRouter(
    prefix="/stores", 
    tags=["Goods & Stores"] 
)

merchandice_relationship_router = APIRouter(
    prefix="/merchandice_relationships", 
    tags=["Goods & Stores"] 
)


# --- ★グッズマスター登録API★ ---
# [POST] /merchandise/
# ----------------------------------------------------
@merchandise_router.post("/", response_model=schemas.Merchandise, tags=["Goods & Stores"])
def create_merchandise(
    merch: schemas.MerchandiseCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいグッズ（例: "ツアーTシャツ"）をデータベースに登録します。
    """
    db_merch = db.query(models.Merchandise).filter(models.Merchandise.name == merch.name).first()
    if db_merch:
        raise HTTPException(status_code=400, detail=f"グッズ名 '{merch.name}' は既に使用されています。")
    
    new_merch = models.Merchandise(**merch.dict())
    db.add(new_merch)
    try:
        db.commit()
        db.refresh(new_merch)
        return new_merch
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

# --- ★店舗マスター登録API★ ---
# [POST] /stores/
# ----------------------------------------------------
@stores_router.post("/", response_model=schemas.Store, tags=["Goods & Stores"])
def create_store(
    store: schemas.StoreCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しい店舗（例: "タワーレコード"）をデータベースに登録します。
    """
    db_store = db.query(models.Store).filter(models.Store.name == store.name).first()
    if db_store:
        raise HTTPException(status_code=400, detail=f"店舗名 '{store.name}' は既に使用されています。")
    
    new_store = models.Store(**store.dict())
    db.add(new_store)
    try:
        db.commit()
        db.refresh(new_store)
        return new_store
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
# --- ★グッズ関連付けAPIエンドポイント★ ---
#
# [POST] /merchandise_relationships/
# ----------------------------------------------------
@merchandice_relationship_router.post("/", response_model=schemas.MerchandiseRelationship, tags=["Goods & Stores"])
def create_merchandise_relationship(
    link: schemas.MerchandiseRelationshipCreate, 
    db: Session = Depends(models.get_db)
):
    """
    グッズ (merch_id_1) と別グッズ (merch_id_2) を、
    指定された関係 (relationship_type) で紐付けます。
    
    例: 「Tシャツ(白)」が「Tシャツ」の "Variation Of" である。
    """
    
    # --- 外部キー制約のチェック ---
    db_merch1 = db.query(models.Merchandise).filter(models.Merchandise.id == link.merchandise_id_1).first()
    if db_merch1 is None:
        raise HTTPException(status_code=404, detail=f"Merchandise ID (子) {link.merchandise_id_1} が見つかりません。")
        
    db_merch2 = db.query(models.Merchandise).filter(models.Merchandise.id == link.merchandise_id_2).first()
    if db_merch2 is None:
        raise HTTPException(status_code=404, detail=f"Merchandise ID (親) {link.merchandise_id_2} が見つかりません。")

    # --- 紐付けデータを作成 ---
    new_link = models.MerchandiseRelationship(**link.dict())
    
    db.add(new_link)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="このグッズの関連付けは既に存在します。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_link)
    
    return new_link