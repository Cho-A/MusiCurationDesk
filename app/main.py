from fastapi import FastAPI, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from . import models , schemas # 先ほど作成したファイルをインポート
from .routers import songs,artists


# --- 1. FastAPIアプリの初期化 ---
app = FastAPI(
    title="MusiCuration Desk API",
    description="音楽キュレーションデータベース「MCD」のバックエンドAPI"
)

# --- 2. データベースの初期化 ---
# (最初の起動時にDBとテーブルを作成)
models.create_db_and_tables() 

app.include_router(songs.router)
app.include_router(artists.router)

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

# [POST] /tieups/
# ----------------------------------------------------
@app.post("/tieups/", response_model=schemas.Tieup, tags=["Tieups"])
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

# --- ★楽曲とタイアップ先の紐付けAPI★ ---
#
# [POST] /song_tieups_links/
# ----------------------------------------------------
@app.post("/song_tieups_links/", response_model=schemas.SongTieupLink, tags=["Links"])
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

# --- ★公演登録APIエンドポイント★ ---
#
# [POST] /performances/
# ----------------------------------------------------
@app.post("/performances/", response_model=schemas.Performance, tags=["Performances"])
def create_performance(
    performance: schemas.PerformanceCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しい公演（ツアー公演、フェス出演、ワンマンなど）をデータベースに登録します。
    """
    
    # --- 外部キー制約のチェック ---
    
    # 1. アーティスト (Artist) が存在するかチェック
    db_artist = db.query(models.Artist).filter(models.Artist.id == performance.artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail=f"Artist ID {performance.artist_id} が見つかりません。")
        
    # 2. ツアー (Tour) IDが提供された場合、存在するかチェック
    if performance.tour_id:
        db_tour = db.query(models.Tour).filter(models.Tour.id == performance.tour_id).first()
        if db_tour is None:
            raise HTTPException(status_code=404, detail=f"Tour ID {performance.tour_id} が見つかりません。")

    # --- データ作成 ---
    new_performance = models.Performance(**performance.dict())
    
    db.add(new_performance)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_performance)
    
    return new_performance


# --- ★公演参加者名簿登録API★ ---
#
# [POST] /performance_roster/
# ----------------------------------------------------
@app.post("/performance_roster/", response_model=schemas.PerformanceRoster, tags=["Performances"])
def add_performance_roster_entry(
    roster_entry: schemas.PerformanceRosterCreate, 
    db: Session = Depends(models.get_db)
):
    """
    特定の公演に、サポートメンバーやゲスト (artist_id) を追加します。
    """
    
    # --- 外部キー制約のチェック ---
    # 1. 公演 (Performance) が存在するかチェック
    db_performance = db.query(models.Performance).filter(models.Performance.id == roster_entry.performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail=f"Performance ID {roster_entry.performance_id} が見つかりません。")
        
    # 2. 参加アーティスト (Artist) が存在するかチェック
    db_artist = db.query(models.Artist).filter(models.Artist.id == roster_entry.artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail=f"Artist ID {roster_entry.artist_id} が見つかりません。")

    # --- 紐付けデータを作成 ---
    new_entry = models.PerformanceRoster(
        performance_id=roster_entry.performance_id,
        artist_id=roster_entry.artist_id,
        role=roster_entry.role,
        context=roster_entry.context
    )
    
    db.add(new_entry)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="この公演に、このアーティストは既に同じ役割で登録されています。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_entry)
    
    return new_entry

# --- ★公演詳細情報 API★ ---

# [GET] /performances/
# ----------------------------------------------------
@app.get("/performances/", response_model=List[schemas.PerformanceSummary], tags=["Performances"])
def read_performances(
    # クエリパラメータを定義
    artist_id: Optional[int] = Query(None, description="メインアクトのアーティストIDでフィルタリングします。"),
    skip: int = Query(0, ge=0, description="取得を開始するレコードのオフセット（ページネーション用）。"),
    limit: int = Query(100, ge=1, le=100, description="取得するレコードの最大数（ページネーション用）。"),
    db: Session = Depends(models.get_db)
):
    """
    公演履歴を一覧で取得します。アーティストIDによるフィルタリングと、日付降順でのソートを行います。
    """
    
    query = db.query(models.Performance)\
        .options(
            # 一覧表示に必要な情報のみをEager Loadする (N+1問題対策)
            joinedload(models.Performance.main_artist),
            joinedload(models.Performance.tour),
        )
    
    # --- フィルタリング処理 ---
    if artist_id is not None:
        # artist_idが指定された場合、そのアーティストの公演のみに絞り込む
        query = query.filter(models.Performance.artist_id == artist_id)
        
    # --- ソート処理 ---
    # 新しい公演から順に（日付降順）並べる
    query = query.order_by(models.Performance.date.desc())
    
    # --- ページネーション処理 ---
    performances = query.offset(skip).limit(limit).all()
    
    # 取得したリストを返却する
    return performances

# [GET] /performances/{performance_id}
# ----------------------------------------------------
@app.get("/performances/{performance_id}", response_model=schemas.Performance, tags=["Performances"])
def read_performance(
    performance_id: int, 
    db: Session = Depends(models.get_db)
):
    """
    指定されたIDの公演情報を取得します。
    セットリスト、公演参加者 (ゲスト/サポート) の詳細を含みます。
    """
    
    db_performance = db.query(models.Performance)\
        .options(
            joinedload(models.Performance.tour),

            joinedload(models.Performance.main_artist), 

            # セットリスト情報を取得（ソートはmodels.pyで定義済み）
            joinedload(models.Performance.setlist_entries), 

            # ★★★ 修正点: Roster情報と、そのアーティスト情報をロード ★★★
            joinedload(models.Performance.roster_entries).joinedload(models.PerformanceRoster.artist),
        )\
        .filter(models.Performance.id == performance_id).first()
    
    if db_performance is None:
        raise HTTPException(status_code=404, detail="公演情報が見つかりません。")
        
    return db_performance

# --- ★ツアー登録APIエンドポイント★ ---
#
# [POST] /tours/
# ----------------------------------------------------
@app.post("/tours/", response_model=schemas.Tour, tags=["Tours"])
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

# --- ★セットリスト登録APIエンドポイント★ ---
#
# [POST] /setlist_entries/
# ----------------------------------------------------
@app.post("/setlist_entries/", response_model=schemas.SetlistEntry, tags=["Performances"])
def create_setlist_entry(
    entry: schemas.SetlistEntryCreate, 
    db: Session = Depends(models.get_db)
):
    """
    特定の公演 (performance_id) に、演奏された楽曲 (song_id) を追加します。
    
    (エラーチェック: performance_id, song_id がDBに存在するか確認します)
    """
    
    # --- 外部キー制約のチェック ---
    
    # 1. 公演 (Performance) が存在するかチェック
    db_performance = db.query(models.Performance).filter(models.Performance.id == entry.performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail=f"Performance ID {entry.performance_id} が見つかりません。")
        
    # 2. 楽曲 (Song) が存在するかチェック
    db_song = db.query(models.Song).filter(models.Song.id == entry.song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail=f"Song ID {entry.song_id} が見つかりません。")

    # --- 紐付けデータを作成 ---
    new_entry = models.SetlistEntry(**entry.dict())
    
    db.add(new_entry)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # ★ UNIQUE制約エラーをここでキャッチ
        if "UNIQUE constraint failed" in str(e):
            # 内部的な複合主キー (performance_id, song_id, order_index) の重複を防ぐ
            raise HTTPException(status_code=400, detail="この公演に、同じ曲順または同じ曲が重複して登録されています。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_entry)
    
    return new_entry

# --- ★タグマスター登録APIエンドポイント★ ---
#
# [POST] /tags/
# ----------------------------------------------------
@app.post("/tags/", response_model=schemas.Tag, tags=["Tags"])
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

# --- ★アルバムマスター登録APIエンドポイント★ ---
#
# [POST] /albums/
# ----------------------------------------------------
@app.post("/albums/", response_model=schemas.Album, tags=["Albums"])
def create_album(
    album: schemas.AlbumCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいアルバム（例: "Catcher In The Spy"）をデータベースに登録します。
    """
    
    # 1. 外部キー (artist_id) が指定されていれば存在チェック
    if album.artist_id:
        db_artist = db.query(models.Artist).filter(models.Artist.id == album.artist_id).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=f"Artist ID {album.artist_id} が見つかりません。")

    # 2. 重複チェック (Spotify Album ID)
    if album.spotify_album_id:
        db_album = db.query(models.Album).filter(models.Album.spotify_album_id == album.spotify_album_id).first()
        if db_album:
            raise HTTPException(status_code=400, detail=f"Spotify Album ID '{album.spotify_album_id}' は既に使用されています。")
    
    # 3. データ作成
    new_album = models.Album(**album.dict())
    
    db.add(new_album)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_album)
    
    return new_album

# [POST] /album_tracks/
# ----------------------------------------------------
@app.post("/album_tracks/", response_model=schemas.AlbumTrack, tags=["Albums"])
def link_song_to_album(
    track: schemas.AlbumTrackCreate, 
    db: Session = Depends(models.get_db)
):
    """
    アルバム (album_id) に、楽曲 (song_id) を
    特定のディスク番号 (disc_number) と曲順 (track_number) で紐付けます。
    """
    
    # 1. アルバム (Album) が存在するかチェック
    db_album = db.query(models.Album).filter(models.Album.id == track.album_id).first()
    if db_album is None:
        raise HTTPException(status_code=404, detail=f"Album ID {track.album_id} が見つかりません。")
        
    # 2. 楽曲 (Song) が存在するかチェック
    db_song = db.query(models.Song).filter(models.Song.id == track.song_id).first()
    if db_song is None:
        raise HTTPException(status_code=404, detail=f"Song ID {track.song_id} が見つかりません。")

    new_track = models.AlbumTrack(**track.dict())
    db.add(new_track)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="このアルバムには既にこの曲または曲順が登録されています。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_track)
    return new_track

# --- ★アルバム関連付けAPIエンドポイント★ ---
#
# [POST] /album_relationships/
# ----------------------------------------------------
@app.post("/album_relationships/", response_model=schemas.AlbumRelationship, tags=["Albums"])
def create_album_relationship(
    link: schemas.AlbumRelationshipCreate, 
    db: Session = Depends(models.get_db)
):
    """
    アルバム (album_id_1) と別アルバム (album_id_2) を、
    指定された関係 (relationship_type) で紐付けます。
    
    例: 「初回盤」が「特典DVD」を "Includes" する。
    """
    
    # --- 外部キー制約のチェック ---
    db_album1 = db.query(models.Album).filter(models.Album.id == link.album_id_1).first()
    if db_album1 is None:
        raise HTTPException(status_code=404, detail=f"Album ID (親) {link.album_id_1} が見つかりません。")
        
    db_album2 = db.query(models.Album).filter(models.Album.id == link.album_id_2).first()
    if db_album2 is None:
        raise HTTPException(status_code=404, detail=f"Album ID (子) {link.album_id_2} が見つかりません。")

    # --- 紐付けデータを作成 ---
    new_link = models.AlbumRelationship(**link.dict())
    
    db.add(new_link)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="このアルバムの関連付けは既に存在します。")
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_link)
    
    return new_link

# --- ★グッズマスター登録API★ ---
# [POST] /merchandise/
# ----------------------------------------------------
@app.post("/merchandise/", response_model=schemas.Merchandise, tags=["Goods & Stores"])
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
@app.post("/stores/", response_model=schemas.Store, tags=["Goods & Stores"])
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
@app.post("/merchandise_relationships/", response_model=schemas.MerchandiseRelationship, tags=["Goods & Stores"])
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

# --- ★ユーザー登録APIエンドポイント★ ---
#
# [POST] /users/
# ----------------------------------------------------
@app.post("/users/", response_model=schemas.User, tags=["Users"])
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(models.get_db)
):
    """
    新しいユーザーをデータベースに登録します。
    (この段階ではパスワードはハッシュ化されません - 認証実装時に修正)
    """
    
    # 1. 既存チェック (username)
    db_user_by_username = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_by_username:
        raise HTTPException(status_code=400, detail=f"ユーザー名 '{user.username}' は既に使用されています。")
        
    # 2. 既存チェック (email)
    db_user_by_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_by_email:
        raise HTTPException(status_code=400, detail=f"メールアドレス '{user.email}' は既に使用されています。")

    # ★★★【重要】★★★
    # 本来はここでパスワードをハッシュ化する
    # hashed_password = auth_utils.hash_password(user.password)
    # が、今は認証を実装していないため、ダミーのハッシュ（または平文のまま）を保存
    # (※セキュリティ上、本番環境では絶対に行わないでください)
    dummy_hashed_password = f"DUMMY_HASH_FOR_{user.password}"
    
    # 3. データ作成
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=dummy_hashed_password 
    )
    
    db.add(new_user)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_user)
    
    return new_user

# --- ★ユーザーの所有物登録API★ ---
#
# [POST] /user_possessions/
# ----------------------------------------------------
@app.post("/user_possessions/", response_model=schemas.UserPossession, tags=["Users"])
def create_user_possession(
    possession: schemas.UserPossessionCreate, 
    db: Session = Depends(models.get_db)
):
    """
    ユーザー (user_id) が特定のアイテム (entity_id) を
    所有している (Owned) または欲しい (Wishlist) ことを登録します。
    """
    
    # --- 外部キー制約のチェック ---
    # 1. ユーザー (User) が存在するかチェック
    db_user = db.query(models.User).filter(models.User.id == possession.user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail=f"User ID {possession.user_id} が見つかりません。")
        
    # 2. entity_type に応じて、対象のアイテムが存在するかチェック (任意だが推奨)
    if possession.entity_type == "album":
        db_item = db.query(models.Album).filter(models.Album.id == possession.entity_id).first()
    elif possession.entity_type == "merchandise":
        db_item = db.query(models.Merchandise).filter(models.Merchandise.id == possession.entity_id).first()
    else:
        raise HTTPException(status_code=400, detail=f"無効な entity_type: '{possession.entity_type}'")
        
    if db_item is None:
        raise HTTPException(status_code=404, detail=f"{possession.entity_type} ID {possession.entity_id} が見つかりません。")

    # --- データ作成 ---
    new_possession = models.UserPossession(**possession.dict())
    
    db.add(new_possession)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_possession)
    
    return new_possession

# [POST] /user_attendance/
# ----------------------------------------------------
@app.post("/user_attendance/", response_model=schemas.UserAttendance, tags=["Users"])
def create_user_attendance(
    attendance: schemas.UserAttendanceCreate, 
    db: Session = Depends(models.get_db)
):
    """
    ユーザー (user_id) が特定の公演 (performance_id) に
    参加した (Attended) ことを登録します。
    """
    
    # 1. ユーザー (User) が存在するかチェック
    db_user = db.query(models.User).filter(models.User.id == attendance.user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail=f"User ID {attendance.user_id} が見つかりません。")
        
    # 2. 公演 (Performance) が存在するかチェック
    db_performance = db.query(models.Performance).filter(models.Performance.id == attendance.performance_id).first()
    if db_performance is None:
        raise HTTPException(status_code=404, detail=f"Performance ID {attendance.performance_id} が見つかりません。")

    new_attendance = models.UserAttendance(**attendance.dict())
    db.add(new_attendance)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")
    
    db.refresh(new_attendance)
    return new_attendance