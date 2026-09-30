from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from backend.dependencies import get_db

from .. import models, schemas

# --- 1. APIRouter のインスタンスを作成 ---
router = APIRouter(
    prefix="/artists",  # このファイル内のAPIはすべて "/songs" で始まる
    tags=["Artists"],  # Swagger UIでのグループ名
)


# [GET] /artists/
# ----------------------------------------------------
@router.get("/", response_model=List[schemas.ArtistDetail], tags=["Artists"])
def get_all_artists(
    skip: int = 0,
    limit: int = 100,
    name_search: str | None = Query(None, description="アーティスト名での部分一致検索"),
    kana_group: str | None = Query(None, description="50音フィルタ用（例: 'やゆよ' または 'A'）"),
    db: Session = Depends(get_db),
):
    """全アーティストのリストを取得する（name_searchやkana_groupで絞り込み可）"""
    query = db.query(models.Artist)

    if name_search:
        from sqlalchemy import or_

        query = query.filter(
            or_(models.Artist.name.ilike(f"%{name_search}%"), models.Artist.name_kana.ilike(f"%{name_search}%"))
        )

    if kana_group:
        from sqlalchemy import or_

        conditions = []
        chars = "abcdefghijklmnopqrstuvwxyz" if kana_group == "A" else kana_group
        for ch in chars:
            conditions.append(models.Artist.name_kana.ilike(f"{ch}%"))
            conditions.append(models.Artist.name.ilike(f"{ch}%"))
        query = query.filter(or_(*conditions))

    artists = query.order_by(models.Artist.id.desc()).offset(skip).limit(limit).all()
    return artists


# [POST] /artists/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Artist, tags=["Artists"])
def create_artist(artist: schemas.ArtistCreate, db: Session = Depends(get_db)):
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
        name=artist.name, name_kana=artist.name_kana, spotify_artist_id=artist.spotify_artist_id, notes=artist.notes
    )

    # 2. データベースに追加 (INSERT)
    db.add(new_artist)

    # 3. 変更を確定
    db.commit()

    # 4. 確定したデータ (IDが採番された状態) をリフレッシュ
    db.refresh(new_artist)

    # 5. 登録したアーティスト情報を返す
    return new_artist


# [GET] /artists/search
# ----------------------------------------------------
@router.get("/search", response_model=List[schemas.Artist], tags=["Artists"])
def search_artists(
    q: str = Query(..., description="アーティスト名検索キーワード"), limit: int = 50, db: Session = Depends(get_db)
):
    """
    名前でアーティストを検索します。
    """
    artists = db.query(models.Artist).filter(models.Artist.name.ilike(f"%{q}%")).limit(limit).all()
    return artists


# --- 4. (おまけ) 登録したアーティストを読み取るAPI ---
@router.get("/{artist_id}", response_model=schemas.ArtistDetail, tags=["Artists"])
def get_artist_by_id(artist_id: int, db: Session = Depends(get_db)):
    """
    指定されたIDのアーティスト情報に加え、別名義と楽曲貢献リストを取得します。
    """
    # 1. アーティストをIDで検索し、関連テーブルを事前に結合 (Eager Load) して取得
    db_artist = (
        db.query(models.Artist)
        .options(
            # Alias (別名義) 情報を取得
            selectinload(models.Artist.aliases),
            # 楽曲リンク (SongArtistLink)
            selectinload(models.Artist.song_links),
            # 楽曲マスターリンク (WorkArtistLink)
            selectinload(models.Artist.work_links),
            selectinload(models.Artist.albums),
            selectinload(models.Artist.tags),
            selectinload(models.Artist.relationships_as_a).joinedload(models.ArtistRelationship.artist_b),
        )
        .filter(models.Artist.id == artist_id)
        .first()
    )

    if db_artist is None:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    # 2. Artistモデルに定義したプロパティ 'songs_contributed' を使ってデータを取得・整形
    #    response_model=schemas.ArtistDetail が自動でプロパティを解決してくれます。
    return db_artist


# --- ★アーティスト貢献度検索 API★ ---
#
# [GET] /artists/{artist_id}/songs
# ----------------------------------------------------
@router.get("/{artist_id}/songs", response_model=schemas.PaginatedSongs, tags=["Artists"])
def get_artist_contributions(
    artist_id: int,
    role: str = Query("all", description="検索したい役割 (例: Composer, または全ての場合は all)"),
    skip: int = Query(0, description="スキップする件数"),
    limit: int = Query(20, description="取得する最大件数"),
    db: Session = Depends(get_db),
):
    """
    特定のアーティストが関わった楽曲を、特定の役割 (role) でページネーションして取得します。
    """
    from sqlalchemy import and_, or_
    from sqlalchemy.orm import selectinload

    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if db_artist is None:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    query = (
        db.query(models.Song)
        .outerjoin(models.SongArtistLink)
        .outerjoin(models.Song.work)
        .outerjoin(models.WorkArtistLink, models.Song.work_id == models.WorkArtistLink.work_id)
        .options(
            selectinload(models.Song.album_links).joinedload(models.AlbumTrack.album),
            selectinload(models.Song.artist_links),
            selectinload(models.Song.work).selectinload(models.MusicalWork.artist_links),
        )
    )

    if role and role != "all":
        query = query.filter(
            or_(
                and_(
                    models.SongArtistLink.artist_id == artist_id,
                    models.SongArtistLink.role_category == role,
                ),
                and_(
                    models.WorkArtistLink.artist_id == artist_id,
                    models.WorkArtistLink.role_category == role,
                ),
            )
        )
    else:
        query = query.filter(
            or_(
                models.SongArtistLink.artist_id == artist_id,
                models.WorkArtistLink.artist_id == artist_id,
            )
        )

    query = query.distinct().order_by(models.Song.id.desc())
    total_count = query.count()
    songs = query.offset(skip).limit(limit).all()

    output_list = []
    for song in songs:
        cover_image_url = None
        if song.album_links and song.album_links[0].album:
            cover_image_url = song.album_links[0].album.cover_image_url

        # この楽曲に対してアーティストが持っている全役割を計算
        roles_set = set()
        for link in song.artist_links:
            if link.artist_id == artist_id:
                roles_set.add(getattr(link, "role_category", None) or getattr(link, "role", "Unknown"))
        if song.work:
            for link in song.work.artist_links:
                if link.artist_id == artist_id:
                    roles_set.add(getattr(link, "role_category", None) or "Unknown")

        output_list.append(
            schemas.SongContribution(
                song_id=song.id,
                title=song.title,
                roles=list(roles_set),
                cover_image_url=cover_image_url,
                is_video=song.is_video,
            )
        )

    return {"total": total_count, "items": output_list}


# --- ★アーティスト編集APIエンドポイント★ ---
#
# [PUT] /artists/{artist_id}
# ----------------------------------------------------
@router.put("/{artist_id}", response_model=schemas.Artist, tags=["Artists"])
def update_artist(artist_id: int, artist: schemas.ArtistCreate, db: Session = Depends(get_db)):
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
        existing_artist = (
            db.query(models.Artist)
            .filter(
                models.Artist.spotify_artist_id == artist.spotify_artist_id,
                models.Artist.id != artist_id,  # ★自分自身は除外する
            )
            .first()
        )
        if existing_artist:
            raise HTTPException(
                status_code=400,
                detail=f"Spotify Artist ID {artist.spotify_artist_id} は既に別のアーティスト ({existing_artist.name}) に登録されています。",
            )

    # --- 3. データの更新 ---
    # schemas.ArtistCreate のフィールドをループして、db_artist オブジェクトに適用
    # exclude_unset=True で、リクエストボディに含まれていないフィールドは更新しない
    for key, value in artist.model_dump(exclude_unset=True).items():
        setattr(db_artist, key, value)

    # --- 4. データベースに変更をコミット ---
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース更新エラー: {e}")

    db.refresh(db_artist)
    return db_artist


# --- メンバー管理 API ---


@router.post("/{artist_id}/members", tags=["Artists"])
def add_artist_member(artist_id: int, member_data: schemas.ArtistMemberCreate, db: Session = Depends(get_db)):
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not db_artist:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    member_artist = db.query(models.Artist).filter(models.Artist.id == member_data.member_artist_id).first()
    if not member_artist:
        raise HTTPException(status_code=404, detail="追加するメンバー（アーティスト）が見つかりません。")

    # 重複チェック
    existing = (
        db.query(models.ArtistRelationship)
        .filter(
            models.ArtistRelationship.artist_id_1 == artist_id,
            models.ArtistRelationship.artist_id_2 == member_data.member_artist_id,
            models.ArtistRelationship.relationship_type == "member",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="既にメンバーとして登録されています。")

    new_rel = models.ArtistRelationship(
        artist_id_1=artist_id,
        artist_id_2=member_data.member_artist_id,
        relationship_type="member",
        start_date=member_data.start_date,
        end_date=member_data.end_date,
    )
    db.add(new_rel)
    db.commit()
    return {"message": "メンバーを追加しました。"}


@router.put("/{artist_id}/members/{member_id}", tags=["Artists"])
def update_artist_member(
    artist_id: int, member_id: int, member_data: schemas.ArtistMemberUpdate, db: Session = Depends(get_db)
):
    rel = (
        db.query(models.ArtistRelationship)
        .filter(
            models.ArtistRelationship.artist_id_1 == artist_id,
            models.ArtistRelationship.artist_id_2 == member_id,
            models.ArtistRelationship.relationship_type == "member",
        )
        .first()
    )
    if not rel:
        raise HTTPException(status_code=404, detail="メンバー登録が見つかりません。")

    if member_data.start_date is not None:
        rel.start_date = member_data.start_date
    if member_data.end_date is not None:
        rel.end_date = member_data.end_date

    db.commit()
    return {"message": "メンバー情報を更新しました。"}


@router.delete("/{artist_id}/members/{member_id}", tags=["Artists"])
def remove_artist_member(artist_id: int, member_id: int, db: Session = Depends(get_db)):
    rel = (
        db.query(models.ArtistRelationship)
        .filter(
            models.ArtistRelationship.artist_id_1 == artist_id,
            models.ArtistRelationship.artist_id_2 == member_id,
            models.ArtistRelationship.relationship_type == "member",
        )
        .first()
    )
    if not rel:
        raise HTTPException(status_code=404, detail="メンバー登録が見つかりません。")

    db.delete(rel)
    db.commit()
    return {"message": "メンバーを削除しました。"}


# --- タグ管理 API ---


@router.post("/{artist_id}/tags", tags=["Artists"])
def add_artist_tag(artist_id: int, tag_data: schemas.TagAssign, db: Session = Depends(get_db)):
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not db_artist:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    tag = db.query(models.Tag).filter(models.Tag.id == tag_data.tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="タグが見つかりません。")

    if tag in db_artist.tags:
        raise HTTPException(status_code=400, detail="既にこのタグは付与されています。")

    db_artist.tags.append(tag)
    db.commit()
    return {"message": "タグを追加しました。"}


@router.delete("/{artist_id}/tags/{tag_id}", tags=["Artists"])
def remove_artist_tag(artist_id: int, tag_id: int, db: Session = Depends(get_db)):
    db_artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
    if not db_artist:
        raise HTTPException(status_code=404, detail="アーティストが見つかりません。")

    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag or tag not in db_artist.tags:
        raise HTTPException(status_code=404, detail="付与されているタグが見つかりません。")

    db_artist.tags.remove(tag)
    db.commit()
    return {"message": "タグを削除しました。"}
