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