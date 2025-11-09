from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models , schemas # 先ほど作成したファイルをインポート

# --- 1. FastAPIアプリの初期化 ---
app = FastAPI(
    title="MusiCuration Desk API",
    description="音楽キュレーションデータベース「MCD」のバックエンドAPI"
)

# --- 2. データベースの初期化 ---
# (最初の起動時にDBとテーブルを作成)
models.create_db_and_tables() 


# --- 3. ★アーティスト登録APIエンドポイント★ ---
# 
# [POST] /artists/
# ----------------------------------------------------
@app.post("/artists/", response_model=schemas.Artist, tags=["Artists"])
def create_artist(
    artist: schemas.ArtistCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいアーティストをデータベースに登録します。
    
    - **name**: アーティストの「正」となる名前 (必須)
    - **spotify_artist_id**: (任意)
    - **notes**: (任意)
    """
    
    # 既に同じ名前のアーティストがいないかチェック
    db_artist = db.query(models.Artist).filter(models.Artist.name == artist.name).first()
    if db_artist:
        raise HTTPException(status_code=400, detail=f"アーティスト名 '{artist.name}' は既に使用されています。")
    
    # 1. 受け取ったデータ (artist) を、DBモデル (models.Artist) に変換
    new_artist = models.Artist(
        name=artist.name,
        spotify_artist_id=artist.spotify_artist_id,
        notes=artist.notes
    )
    
    # 2. データベースに追加 (INSERT)
    db.add(new_artist)
    
    # 3. 変更を確定
    db.commit()
    
    # 4. 確定したデータ (IDが採番された状態) をリフレッシュ
    db.refresh(new_artist)
    
    # 5. 登録したアーティスト情報を返す
    return new_artist


# --- 4. (おまけ) 登録したアーティストを読み取るAPI ---
@app.get("/artists/{artist_id}", response_model=schemas.Artist, tags=["Artists"])
def read_artist(artist_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDのアーティスト情報を取得します。
    """
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")
    return db_artist

# --- ★楽曲登録APIエンドポイント★ ---
#
# [POST] /songs/
# ----------------------------------------------------
@app.post("/songs/", response_model=schemas.Song, tags=["Songs"])
def create_song(
    song: schemas.SongCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しい楽曲をデータベースに登録します。
    
    - **title**: 楽曲の「正」となる名前 (必須)
    - **release_date**: 発売日 (任意)
    - **spotify_song_id**: (任意)
    - **jasrac_title**: (任意)
    """
    
    # 1. 受け取ったデータ (song) を、DBモデル (models.Song) に変換
    #    **kwargs を使うと、SongCreateの全フィールドを自動で渡せる
    new_song = models.Song(**song.dict())
    
    # 2. データベースに追加 (INSERT)
    db.add(new_song)
    
    # 3. 変更を確定
    try:
        db.commit()
    except Exception as e:
        db.rollback() # エラーが出たら変更を元に戻す
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    # 4. 確定したデータ (IDが採番された状態) をリフレッシュ
    db.refresh(new_song)
    
    # 5. 登録した楽曲情報を返す
    return new_song

# [POST] /song_artist_links/
# ----------------------------------------------------
@app.post("/song_artist_links/", response_model=schemas.SongArtistLink, tags=["Links"])
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