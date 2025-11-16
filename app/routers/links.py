from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models , schemas # 先ほど作成したファイルをインポート

# --- 1. APIRouter のインスタンスを作成 ---
song_artist_router = APIRouter(
    prefix="/song_artist_links", # このファイル内のAPIはすべて "/songs" で始まる
    tags=["Links"]   # Swagger UIでのグループ名
)

song_tieup_router = APIRouter(
    prefix="/song_tieup_links", # このファイル内のAPIはすべて "/songs" で始まる
    tags=["Links"]   # Swagger UIでのグループ名
)

# [POST] /song_artist_links/
# ----------------------------------------------------
@song_artist_router.post("/", response_model=schemas.SongArtistLink, tags=["Links"])
def link_song_to_artist(
    link: schemas.SongArtistLinkCreate, 
    db: Session = Depends(models.get_db)
):
    """
    楽曲 (song_id) とアーティスト (artist_id) を、
    指定された役割 (role) で紐付けます。
    
    (エラーチェック: song_id, artist_id がDBに存在するか確認します)
    """
    
    # --- 外部キー制約のチェック ---
    
    # 1. 楽曲 (Song) が存在するかチェック
    db_song = db.query(models.Song).filter(models.Song.id == link.song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail=f"Song ID {link.song_id} が見つかりません。")
        
    # 2. アーティスト (Artist) が存在するかチェック
    db_artist = db.query(models.Artist).filter(models.Artist.id == link.artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail=f"Artist ID {link.artist_id} が見つかりません。")

    # --- 紐付けデータ (Association Object) を作成 ---
    new_link = models.SongArtistLink(
        song_id=link.song_id,
        artist_id=link.artist_id,
        role=link.role
    )
    
    db.add(new_link)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # ★ v2.5のUNIQUE制約エラーをここでキャッチ
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="この紐付け（曲・アーティスト・役割の組み合わせ）は既に存在します。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_link)
    
    return new_link

# --- ★楽曲とタイアップ先の紐付けAPI★ ---
#
# [POST] /song_tieups_links/
# ----------------------------------------------------
@song_tieup_router.post("/", response_model=schemas.SongTieupLink, tags=["Links"])
def link_song_to_tieup(
    link: schemas.SongTieupLinkCreate, 
    db: Session = Depends(models.get_db)
):
    """
    楽曲 (song_id) とタイアップ先 (tieup_id) を、
    指定された文脈 (context) と並び順 (sort_index) で紐付けます。
    
    (エラーチェック: song_id, tieup_id がDBに存在するか確認します)
    """
    
    # --- 外部キー制約のチェック ---
    
    # 1. 楽曲 (Song) が存在するかチェック
    db_song = db.query(models.Song).filter(models.Song.id == link.song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail=f"Song ID {link.song_id} が見つかりません。")
        
    # 2. タイアップ先 (Tieup) が存在するかチェック
    db_tieup = db.query(models.Tieup).filter(models.Tieup.id == link.tieup_id).first()
    if db_tieup is None:
        raise HTTPException(status_code=404, detail=f"Tieup ID {link.tieup_id} が見つかりません。")

    # --- 紐付けデータ (Association Object) を作成 ---
    new_link = models.SongTieupLink(
        song_id=link.song_id,
        tieup_id=link.tieup_id,
        context=link.context,
        sort_index=link.sort_index
    )
    
    db.add(new_link)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # ★ v2.5のUNIQUE制約エラーをここでキャッチ
        if "UNIQUE constraint failed" in str(e):
            if "_tieup_sort_index_uc" in str(e):
                raise HTTPException(status_code=400, detail=f"このタイアップ先 (Tieup ID {link.tieup_id}) で、並び順 {link.sort_index} は既に使用されています。")
            raise HTTPException(status_code=400, detail="この紐付けは既に存在します。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_link)
    
    return new_link