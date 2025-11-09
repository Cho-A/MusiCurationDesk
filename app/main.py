from fastapi import FastAPI, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
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
@app.get("/artists/{artist_id}", response_model=schemas.ArtistDetail, tags=["Artists"])
def read_artist(artist_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDのアーティスト情報に加え、別名義と楽曲貢献リストを取得します。
    """
    # 1. アーティストをIDで検索し、関連テーブルを事前に結合 (Eager Load) して取得
    db_artist = db.query(models.Artist)\
        .options(
            # Alias (別名義) 情報を取得
            joinedload(models.Artist.aliases),
            # 楽曲リンク (SongArtistLink) 情報とその先の楽曲タイトルをまとめて取得
            joinedload(models.Artist.song_links)\
                .joinedload(models.SongArtistLink.song),
        )\
        .filter(models.Artist.id == artist_id).first()
    
    if db_artist is None:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")
    
    # 2. Artistモデルに定義したプロパティ 'songs_contributed' を使ってデータを取得・整形
    #    response_model=schemas.ArtistDetail が自動でプロパティを解決してくれます。
    return db_artist

# --- ★アーティスト貢献度検索 API★ ---
#
# [GET] /artists/{artist_id}/songs
# ----------------------------------------------------
@app.get("/artists/{artist_id}/songs", response_model=List[schemas.SongSearchResult], tags=["Artists"])
def get_artist_contributions(
    artist_id: int,
    # カンマ区切りの文字列でroleを受け取る (例: Composer,Lyricist)
    roles: Optional[str] = Query(None, description="検索したい役割 (カンマ区切り、例: Composer,Vocalist)"),
    sort_by: str = Query("release_date", description="ソート基準 (release_date, title)"),
    db: Session = Depends(models.get_db)
):
    """
    特定のアーティストが関わった楽曲を、役割 (role) で絞り込んでリストとして取得します。
    """
    
    # 1. アーティストの存在チェック
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    # 2. クエリの組み立て開始 (Songテーブルを主軸にする)
    query = db.query(models.Song, models.SongArtistLink.role)\
                .join(models.SongArtistLink)\
                .filter(models.SongArtistLink.artist_id == artist_id)
    
    # 3. ロール (役割) のフィルタリング
    if roles:
        # 入力されたカンマ区切り文字列をリストに変換 (例: "Composer,Vocalist" -> ["Composer", "Vocalist"])
        role_list = [r.strip() for r in roles.split(',')]
        query = query.filter(models.SongArtistLink.role.in_(role_list))
        
    # 4. ソート (発売日順は要件⑤を満たすため重要)
    if sort_by == "release_date":
        # 発売日が新しいもの順 (降順) にソート
        query = query.order_by(models.Song.release_date.desc())
    elif sort_by == "title":
        query = query.order_by(models.Song.title)
    
    # 5. データの取得
    results = query.all()

    # 6. Pydanticスキーマに合わせた最終的なデータ整形
    # SongSearchResultスキーマの要求に合わせて、Songオブジェクトとroleを統合します
    output_list = []
    for song, role in results:
        output_list.append(schemas.SongSearchResult(
            id=song.id,
            title=song.title,
            release_date=song.release_date,
            role=role # ★ SongArtistLinkから取得したroleを付与
        ))
        
    return output_list

# --- ★アーティスト編集APIエンドポイント★ ---
#
# [PUT] /artists/{artist_id}
# ----------------------------------------------------
@app.put("/artists/{artist_id}", response_model=schemas.Artist, tags=["Artists"])
def update_artist(
    artist_id: int,
    artist: schemas.ArtistCreate, 
    db: Session = Depends(models.get_db)
):
    """
    指定されたIDのアーティスト情報を更新します。
    (Spotify Artist IDの重複チェックあり)
    """
    
    # 1. 既存のアーティストをIDで検索
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail="更新対象のアーティストが見つかりません。")

    # --- 2. ID重複チェック (自己参照以外の重複をチェック) ---
    
    # Spotify Artist IDが既に別のアーティストに使われていないかチェック
    if artist.spotify_artist_id:
        existing_artist = db.query(models.Artist).filter(
            models.Artist.spotify_artist_id == artist.spotify_artist_id,
            models.Artist.id != artist_id  # ★自分自身は除外する
        ).first()
        if existing_artist:
            raise HTTPException(status_code=400, detail=f"Spotify Artist ID {artist.spotify_artist_id} は既に別のアーティスト ({existing_artist.name}) に登録されています。")

    # --- 3. データの更新 ---
    # schemas.ArtistCreate のフィールドをループして、db_artist オブジェクトに適用
    # exclude_unset=True で、リクエストボディに含まれていないフィールドは更新しない
    for key, value in artist.dict(exclude_unset=True).items():
        setattr(db_artist, key, value)
    
    # --- 4. データベースに変更をコミット ---
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース更新エラー: {e}")

    db.refresh(db_artist)
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

# --- ★★★ 全楽曲の一覧を取得するAPI (上書き) ★★★ ---
# 
# [GET] /songs/
# ----------------------------------------------------
@app.get("/songs/", response_model=List[schemas.Song], tags=["Songs"])
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
@app.put("/songs/{song_id}", response_model=schemas.Song, tags=["Songs"])
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

@app.delete("/songs/{song_id}", tags=["Songs"], status_code=204)
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