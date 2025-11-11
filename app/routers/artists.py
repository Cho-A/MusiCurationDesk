from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

# --- 1. APIRouter のインスタンスを作成 ---
router = APIRouter(
    prefix="/artists", # このファイル内のAPIはすべて "/songs" で始まる
    tags=["Artists"]   # Swagger UIでのグループ名
)

# [POST] /artists/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Artist, tags=["Artists"])
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
@router.get("/{artist_id}", response_model=schemas.ArtistDetail, tags=["Artists"])
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
@router.get("/{artist_id}/songs", response_model=List[schemas.SongSearchResult], tags=["Artists"])
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
@router.put("/{artist_id}", response_model=schemas.Artist, tags=["Artists"])
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