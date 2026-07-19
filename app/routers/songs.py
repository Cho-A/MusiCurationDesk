from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

# --- 1. APIRouter のインスタンスを作成 ---
router = APIRouter(
    prefix="/songs", # このファイル内のAPIはすべて "/songs" で始まる
)


# --- ★楽曲登録APIエンドポイント★ ---
#
# [POST] /songs/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Song, tags=["Songs"])
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

# --- ★★★ 全楽曲の一覧を取得するAPI (上書き) ★★★ ---
# 
# [GET] /songs/
# ----------------------------------------------------
@router.get("/", response_model=List[schemas.Song], tags=["Songs"])
def read_songs(
    skip: int = 0,
    limit: int = 100,
    title_search: Optional[str] = Query(None, description="曲名での部分一致検索"),
    sort_by: str = Query("id", description="ソート基準 (id, title, release_date)"),
    # ★ 拡張検索パラメータの追加 ★
    role_filter: Optional[str] = Query(None, description="役割によるフィルタ (カンマ区切り、例: Composer,Vocalist)"),
    tieup_id_filter: Optional[int] = Query(None, description="タイアップIDによるフィルタ"),
    # ★★★ 新規追加 ★★★
    artist_id_filter: Optional[int] = Query(None, description="特定のアーティストIDで絞り込む"),
    db: Session = Depends(models.get_db)
):
    """
    データベースに登録されている楽曲の一覧を、検索・ソート・フィルタリングして取得します。
    """
    
    # 1. クエリの組み立て開始
    query = db.query(models.Song)

    # 2. フィルタリング (ArtistとRoleの絞り込みを統合)
    if role_filter or artist_id_filter:
        # artist_id_filter がある場合、必ず SongArtistLink を JOIN する
        query = query.join(models.Song.artist_links)
        
        if role_filter:
            role_list = [r.strip() for r in role_filter.split(',')]
            # SongArtistLinkのroleがリストに含まれる AND (かつ) artist_idが一致
            query = query.filter(models.SongArtistLink.role.in_(role_list))
            
        if artist_id_filter:
            # 必須: 特定のアーティストIDに絞り込む
            query = query.filter(models.SongArtistLink.artist_id == artist_id_filter)
        
    if title_search:
        query = query.filter(models.Song.title.ilike(f"%{title_search}%"))
        
    if tieup_id_filter:
        query = query.join(models.Song.tieup_links).filter(models.SongTieupLink.tieup_id == tieup_id_filter)
        
    # 3. ソート (変更なし)
    if sort_by == "release_date":
        query = query.order_by(models.Song.release_date.desc(), models.Song.id.desc())
    elif sort_by == "title":
        query = query.order_by(models.Song.title)
    else:
        query = query.order_by(models.Song.id.desc())

    # 4. データの取得 (ページネーション適用)
    songs = query.distinct().offset(skip).limit(limit).all()
    
    return songs

# [PUT] /songs/{song_id}
# ----------------------------------------------------
@router.put("/{song_id}", response_model=schemas.Song, tags=["Songs"])
def update_song(
    song_id: int,
    song: schemas.SongCreate, 
    db: Session = Depends(models.get_db)
):
    """
    指定されたIDの楽曲情報を更新します。
    (Spotify ID / JASRACコードの重複チェックあり)
    """
    
    # 1. 既存の楽曲をIDで検索
    db_song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail="更新対象の楽曲が見つかりません。")

    # --- 2. ID重複チェック (自己参照以外の重複をチェック) ---
    
    # 2a. Spotify IDが既に別の曲に使われていないかチェック
    if song.spotify_song_id:
        existing_song = db.query(models.Song).filter(
            models.Song.spotify_song_id == song.spotify_song_id,
            models.Song.id != song_id  # ★自分自身は除外する
        ).first()
        if existing_song:
            raise HTTPException(status_code=400, detail=f"Spotify ID {song.spotify_song_id} は既に別の曲 ({existing_song.title}) に登録されています。")
    
    # 2b. JASRAC コードが既に別の曲に使われていないかチェック
    if song.jasrac_code:
        existing_song = db.query(models.Song).filter(
            models.Song.jasrac_code == song.jasrac_code,
            models.Song.id != song_id # ★自分自身は除外する
        ).first()
        if existing_song:
            raise HTTPException(status_code=400, detail=f"JASRAC Code {song.jasrac_code} は既に別の曲 ({existing_song.title}) に登録されています。")

    # --- 3. データの更新 ---
    # schemas.SongCreate のフィールドをループして、db_song オブジェクトに適用
    for key, value in song.dict(exclude_unset=True).items():
        setattr(db_song, key, value)
    
    # --- 4. データベースに変更をコミット ---
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース更新エラー: {e}")

    db.refresh(db_song)
    return db_song

# --- ★★★ 楽曲詳細取得API (GET /songs/{song_id}) ★★★ ---
#
# [GET] /songs/{song_id}
# ----------------------------------------------------
@router.get("/{song_id}", response_model=schemas.SongDetail, tags=["Songs"])
def read_song(song_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDの楽曲詳細情報を取得します。
    アーティスト貢献度、タイアップ、タグ、最終演奏日、演奏回数を含みます。
    """
    
    # 1. 楽曲をIDで検索し、関連テーブルを事前に結合 (Eager Load) して取得
    db_song = db.query(models.Song)\
        .options(
            # 貢献アーティスト (ArtistLink -> Artist)
            joinedload(models.Song.artist_links)\
                .joinedload(models.SongArtistLink.artist),
            
            # タイアップ (TieupLink -> Tieup)
            joinedload(models.Song.tieup_links)\
                .joinedload(models.SongTieupLink.tieup),
                
            # タグ (Tag)
            joinedload(models.Song.tags)
        )\
        .filter(models.Song.id == song_id).first()
    
    if db_song is None:
        raise HTTPException(status_code=404, detail="楽曲が見つかりません。")
        
    # 2. 応答
    # FastAPIが自動で response_model (SongDetail) に基づき、
    # db_song オブジェクトと、models.pyで定義した @property (last_played_date, play_count)
    # を解決してJSONを構築します。
    return db_song

@router.delete("/{song_id}", tags=["Songs"], status_code=204)
def delete_song(song_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDの楽曲をデータベースから削除します。
    """
    # 1. 楽曲をIDで検索
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    
    # 2. 楽曲が存在しない場合は404エラー
    if song is None:
        raise HTTPException(status_code=404, detail=f"Song with ID {song_id} not found")

    # 3. 削除を実行
    # 注: この曲に紐づく artist_links, album_tracks などの中間テーブルの
    # エントリも同時に削除されるように、models.py側でCASCADE設定が必要です。
    # (現在の設計では未設定の可能性がありますが、一旦進めます)
    db.delete(song)
    
    # 4. データベースに変更をコミット
    db.commit()
    
    # 5. 成功を示すHTTP 204 No Contentを返却
    return Response(status_code=204)

# --- ★楽曲にタグを紐付けるAPI★ ---
#
# [POST] /songs/{song_id}/tags/{tag_id}
# ----------------------------------------------------
@router.post("/{song_id}/tags/{tag_id}", response_model=schemas.SongDetail, tags=["Tags"])
def link_song_to_tag(
    song_id: int,
    tag_id: int,
    db: Session = Depends(models.get_db)
):
    """
    特定の楽曲 (song_id) に、タグ (tag_id) を紐付けます。
    (SQLAlchemyの Simple Many-to-Many パターンを使用)
    """
    
    # 1. 楽曲 (Song) を取得
    db_song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail=f"Song ID {song_id} が見つかりません。")
        
    # 2. タグ (Tag) を取得
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(status_code=404, detail=f"Tag ID {tag_id} が見つかりません。")

    # 3. 既に追加されていないかチェック
    if db_tag in db_song.tags:
        raise HTTPException(status_code=400, detail="この曲には既にこのタグが紐付いています。")

    # 4. 紐付け (中間テーブルへの書き込み)
    db_song.tags.append(db_tag)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(db_song)
    
    # 5. 更新された楽曲情報（タグリスト含む）を返す
    # (再度Eager Loadをかけて、完全な情報を返す)
    updated_song = read_song(song_id=song_id, db=db)
    return updated_song

# (POST /songs/generate-spotify-ids)
# ----------------------------------------------------
@router.post("/generate-spotify-ids", response_model=List[str], tags=["Playlists"])
def generate_spotify_ids_from_search(
    # read_songs と同じ検索条件を「リクエストボディ」として受け取る
    search_params: schemas.SongSearch, # 👈 ★新しいスキーマ
    db: Session = Depends(models.get_db)
):
    """
    GET /songs/ と同じ検索条件（アーティスト、役割、タイアップ等）に
    合致する楽曲の **Spotify Song ID** のリストを返します。
    
    （このリストを使ってSpotifyプレイリストを作成します）
    """
    
    # --- GET /songs/ と全く同じ検索ロジック ---
    query = db.query(models.Song)
    
    if search_params.role_filter or search_params.artist_id_filter:
        query = query.join(models.Song.artist_links)
        if search_params.role_filter:
            role_list = [r.strip() for r in search_params.role_filter.split(',')]
            query = query.filter(models.SongArtistLink.role.in_(role_list))
        if search_params.artist_id_filter:
            query = query.filter(models.SongArtistLink.artist_id == search_params.artist_id_filter)
    
    if search_params.title_search:
        query = query.filter(models.Song.title.ilike(f"%{search_params.title_search}%"))
        
    if search_params.tieup_id_filter:
        query = query.join(models.Song.tieup_links).filter(models.SongTieupLink.tieup_id == search_params.tieup_id_filter)
    
    # --- ソート ---
    if search_params.sort_by == "release_date":
        query = query.order_by(models.Song.release_date.desc(), models.Song.id.desc())
    elif search_params.sort_by == "title":
        query = query.order_by(models.Song.title)
    else:
        query = query.order_by(models.Song.id.desc())

    # --- ★ 最終的な出力 (Spotify IDのみ) ---
    results = query.distinct().all()
    
    # spotify_song_id が NULL でないものだけを抽出
    spotify_ids = [song.spotify_song_id for song in results if song.spotify_song_id]
    
    return spotify_ids