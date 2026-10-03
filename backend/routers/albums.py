from __future__ import annotations

from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_db

from .. import models, schemas

router = APIRouter(prefix="/albums")


# --- ★アルバムマスター登録APIエンドポイント★ ---
#
# [POST] /albums/
# ----------------------------------------------------
@router.post("/", response_model=schemas.Album)
def create_album(album: schemas.AlbumCreate, db: Session = Depends(get_db)):
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
            raise HTTPException(
                status_code=400, detail=f"Spotify Album ID '{album.spotify_album_id}' は既に使用されています。"
            )

    # 3. データ作成
    album_data = album.model_dump()
    if not album_data.get("album_group_id"):
        db_album_group = models.AlbumGroup(
            title=album.main_title,
            artist_id=album.artist_id,
            release_date=album.physical_release_date or album.digital_release_date,
            album_type=album.album_type,
            cover_image_url=album.cover_image_url,
        )
        db.add(db_album_group)
        db.commit()
        db.refresh(db_album_group)
        album_data["album_group_id"] = db_album_group.id

    new_album = models.Album(**album_data)
    db.add(new_album)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"データベース登録エラー: {e}")

    db.refresh(new_album)

    return new_album


# [GET] /albums/
# ----------------------------------------------------
@router.get("/", response_model=List[schemas.Album])
def get_all_albums(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    全アルバムの一覧を取得します。
    """
    return db.query(models.Album).order_by(models.Album.id.desc()).offset(skip).limit(limit).all()


# [GET] /albums/{album_id}
# ----------------------------------------------------
@router.get("/{album_id}", response_model=schemas.AlbumDetail)
def get_album_by_id(album_id: int, db: Session = Depends(get_db)):
    """
    指定されたIDのアルバム詳細情報を取得します。
    収録されている楽曲（トラック）も同時に取得します。
    """
    album = (
        db.query(models.Album)
        .options(
            joinedload(models.Album.artist), joinedload(models.Album.album_tracks).joinedload(models.AlbumTrack.song)
        )
        .filter(models.Album.id == album_id)
        .first()
    )

    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


# [POST] /album_tracks/
# ----------------------------------------------------
@router.post("/tracks", response_model=schemas.AlbumTrack)
def link_song_to_album(track: schemas.AlbumTrackCreate, db: Session = Depends(get_db)):
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

    new_track = models.AlbumTrack(**track.model_dump())
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
@router.post("/relationships", response_model=schemas.AlbumRelationship)
def create_album_relationship(link: schemas.AlbumRelationshipCreate, db: Session = Depends(get_db)):
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
    new_link = models.AlbumRelationship(**link.model_dump())

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


# [POST] /albums/import-cd
# ----------------------------------------------------
@router.post("/import-cd", response_model=schemas.Album)
def import_cd_album(request: schemas.CDImportRequest, db: Session = Depends(get_db)):
    """
    手動アルバムビルダー (MusicBrainz連携) 用エンドポイント。
    CDの構成 (ディスク番号、トラック番号) を正としてアルバムを新規作成、または上書き更新します。
    """
    try:
        album = None

        if not request.target_album_id:
            # 新規作成の場合
            db_album_group = models.AlbumGroup(
                title=request.title,
                release_date=request.release_date,
                album_type=request.album_type,
                artist_id=request.artist_id,
            )
            db.add(db_album_group)
            db.commit()
            db.refresh(db_album_group)

            album = models.Album(
                main_title=request.title,
                physical_release_date=request.release_date,
                album_type=request.album_type,
                album_group_id=db_album_group.id,
            )
            db.add(album)
            db.commit()
            db.refresh(album)
        else:
            # 上書きの場合
            album = db.query(models.Album).filter(models.Album.id == request.target_album_id).first()
            if not album:
                raise HTTPException(status_code=404, detail="対象のアルバムが見つかりません。")

            if not request.append_mode:
                # 既存のトラックとディスクをすべて削除して上書き (append_modeがFalseの場合)
                db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album.id).delete()
                db.query(models.AlbumDisc).filter(models.AlbumDisc.album_id == album.id).delete()

                # アルバムメタデータを更新
                album.main_title = request.title
                if request.release_date:
                    album.physical_release_date = request.release_date
                if request.album_type:
                    album.album_type = request.album_type
                if request.artist_id:
                    if album.album_group:
                        album.album_group.artist_id = request.artist_id
                    album.artist_id = request.artist_id
            db.commit()

        # ディスク情報の保存
        for disc_req in request.discs:
            album_disc = models.AlbumDisc(
                album_id=album.id,
                disc_number=disc_req.disc_number,
                title=disc_req.title,
                media_format=disc_req.media_format,
                edition=disc_req.edition,
            )
            db.add(album_disc)

        # トラックリストを登録
        seen_tracks = set()
        for track_req in request.tracks:
            key = (track_req.disc_number, track_req.track_number)
            if key in seen_tracks:
                raise HTTPException(
                    status_code=400,
                    detail=f"リクエスト内に重複したトラックが含まれています: Disc {track_req.disc_number}, Track {track_req.track_number}",
                )
            seen_tracks.add(key)

            song_id = track_req.song_id

            # サブスク未解禁曲（song_idがnull）の場合は新規にSongレコードを作成
            if not song_id:
                new_song = models.Song(title=track_req.title, spotify_song_id=None)
                db.add(new_song)
                db.flush()
                song_id = new_song.id

            # アルバムのメインアーティストを紐付ける (apply_artist_to_tracksがTrueの場合)
            if request.apply_artist_to_tracks and album.album_group and album.album_group.artist_id:
                # 既存の "Artist" リンクがあれば削除
                db.query(models.SongArtistLink).filter(
                    models.SongArtistLink.song_id == song_id, models.SongArtistLink.role_category == "Artist"
                ).delete(synchronize_session=False)

                artist_link = models.SongArtistLink(
                    song_id=song_id, artist_id=album.album_group.artist_id, role_category="Artist"
                )
                db.add(artist_link)

            # AlbumTrackを作成
            album_track = models.AlbumTrack(
                album_id=album.id,
                song_id=song_id,
                disc_number=track_req.disc_number,
                track_number=track_req.track_number,
                media_format=track_req.media_format,
                notes=track_req.notes,
                display_title=track_req.display_title or track_req.title,
            )
            db.add(album_track)

        db.commit()
        db.refresh(album)
        return album
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"CDインポート中にエラーが発生しました: {str(e)}")


# [PUT] /albums/{album_id}/tracks/{track_id}
# ----------------------------------------------------
@router.put("/{album_id}/tracks/{track_id}", response_model=schemas.AlbumTrack)
def update_album_track(album_id: int, track_id: int, request: schemas.AlbumTrackUpdate, db: Session = Depends(get_db)):
    """
    アルバム内の特定のトラックのメタデータ（表示名や備考など）を更新します。
    """
    track = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.id == track_id, models.AlbumTrack.album_id == album_id)
        .first()
    )

    if not track:
        raise HTTPException(status_code=404, detail="トラックが見つかりません。")

    if request.display_title is not None:
        track.display_title = request.display_title
    if request.notes is not None:
        track.notes = request.notes
    if request.media_format is not None:
        track.media_format = request.media_format
    if request.disc_number is not None:
        track.disc_number = request.disc_number
    if request.track_number is not None:
        track.track_number = request.track_number
    if request.song_id is not None:
        # 楽曲IDが変更された場合、対象のSongが存在するか確認
        song = db.query(models.Song).filter(models.Song.id == request.song_id).first()
        if not song:
            raise HTTPException(status_code=404, detail="指定された楽曲が存在しません。")
        track.song_id = request.song_id

    db.commit()
    db.refresh(track)
    return track


# [PUT] /albums/{album_id}
# ----------------------------------------------------
@router.put("/{album_id}", response_model=schemas.Album)
def update_album(album_id: int, request: schemas.AlbumUpdate, db: Session = Depends(get_db)):
    """
    アルバムメタデータを更新します。
    """
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="対象のアルバムが見つかりません。")

    old_album_group_id = album.album_group_id
    group_changed = False

    if request.main_title is not None:
        album.main_title = request.main_title
    if request.version_title is not None:
        album.version_title = request.version_title
    if request.artist_id is not None:
        album.artist_id = request.artist_id
    if request.physical_release_date is not None:
        album.physical_release_date = request.physical_release_date
    if request.digital_release_date is not None:
        album.digital_release_date = request.digital_release_date
    if request.spotify_album_id is not None:
        album.spotify_album_id = request.spotify_album_id
    if request.cover_image_url is not None:
        album.cover_image_url = request.cover_image_url
    if request.album_type is not None:
        album.album_type = request.album_type

    if request.album_group_id is not None and request.album_group_id != album.album_group_id:
        # verify the target album_group_id exists
        target_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == request.album_group_id).first()
        if not target_group:
            raise HTTPException(status_code=400, detail="Target AlbumGroup not found.")
        album.album_group_id = request.album_group_id
        group_changed = True

        # アルバムグループのカバー画像がない場合、マージされるアルバムのカバー画像を継承する
        if not target_group.cover_image_url and album.cover_image_url:
            target_group.cover_image_url = album.cover_image_url
            db.add(target_group)

    db.commit()
    db.refresh(album)

    # cleanup old group if empty
    if group_changed and old_album_group_id is not None:
        remaining = db.query(models.Album).filter(models.Album.album_group_id == old_album_group_id).count()
        if remaining == 0:
            old_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == old_album_group_id).first()
            if old_group:
                db.delete(old_group)
                db.commit()

    return album


# [PUT] /albums/{album_id}/bulk-streaming-availability
# ----------------------------------------------------
@router.put("/{album_id}/bulk-streaming-availability")
def update_bulk_streaming_availability(
    album_id: int, request: schemas.BulkStreamingAvailabilityUpdate, db: Session = Depends(get_db)
):
    query = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album_id)
    if request.disc_number is not None:
        query = query.filter(models.AlbumTrack.disc_number == request.disc_number)

    tracks = query.all()
    song_ids = list(set([t.song_id for t in tracks]))

    db.query(models.Song).filter(models.Song.id.in_(song_ids)).update(
        {"is_streaming_available": request.is_streaming_available}, synchronize_session=False
    )
    db.commit()
    return {"message": f"Updated {len(song_ids)} songs"}


# [POST] /albums/{album_id}/duplicate
# ----------------------------------------------------
@router.post("/{album_id}/duplicate", response_model=schemas.Album)
def duplicate_album(album_id: int, request: schemas.AlbumDuplicateRequest, db: Session = Depends(get_db)):
    # 1. Fetch original album
    original_album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not original_album:
        raise HTTPException(status_code=404, detail="Album not found")

    # 2. Create new album
    new_album = models.Album(
        album_group_id=original_album.album_group_id,
        main_title=original_album.main_title,
        version_title=request.version_title
        or (original_album.version_title + " (Copy)" if original_album.version_title else "Copy"),
        artist_id=original_album.artist_id,
        physical_release_date=original_album.physical_release_date,
        digital_release_date=original_album.digital_release_date,
        spotify_album_id=None,  # Do not copy spotify ID as it must be unique
        cover_image_url=original_album.cover_image_url,
        album_type=original_album.album_type,
        media_format=request.media_format or original_album.media_format,
    )
    db.add(new_album)
    db.flush()

    # 3. Duplicate discs
    original_discs = db.query(models.AlbumDisc).filter(models.AlbumDisc.album_id == album_id).all()
    disc_mapping = {}  # old_disc_number -> new_disc
    for old_disc in original_discs:
        new_disc = models.AlbumDisc(
            album_id=new_album.id,
            disc_number=old_disc.disc_number,
            title=old_disc.title,
            media_format=request.media_format or old_disc.media_format,
            edition=request.version_title or old_disc.edition,
        )
        db.add(new_disc)
        disc_mapping[old_disc.disc_number] = new_disc

    db.flush()

    # 4. Duplicate tracks
    original_tracks = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album_id).all()
    for old_track in original_tracks:
        new_track = models.AlbumTrack(
            album_id=new_album.id,
            song_id=old_track.song_id,
            track_number=old_track.track_number,
            disc_number=old_track.disc_number,
            duration_ms=old_track.duration_ms,
            display_title=old_track.display_title,
            notes=old_track.notes,
            spotify_track_id=None,  # Do not copy spotify track ID
        )
        db.add(new_track)

    db.commit()
    db.refresh(new_album)
    return new_album


# [PUT] /albums/{album_id}/discs/{disc_id}
# ----------------------------------------------------
@router.put("/{album_id}/discs/{disc_id}", response_model=schemas.AlbumDiscBase)
def update_album_disc(album_id: int, disc_id: int, request: schemas.AlbumDiscUpdate, db: Session = Depends(get_db)):
    """
    ディスク情報を更新します（主にタイトル名）。
    """
    disc = (
        db.query(models.AlbumDisc).filter(models.AlbumDisc.id == disc_id, models.AlbumDisc.album_id == album_id).first()
    )

    if not disc:
        raise HTTPException(status_code=404, detail="対象のディスクが見つかりません。")

    if request.title is not None:
        disc.title = request.title
    if request.media_format is not None:
        disc.media_format = request.media_format

        # ユーザー要望: DVDかBlu-rayに変更したとき、収録楽曲の区分も「映像」に自動変更
        format_lower = request.media_format.lower()
        if format_lower in ["dvd", "blu-ray", "bd", "blu-ray disc", "video"]:
            is_video = True
        elif format_lower in ["cd", "digital", "vinyl", "cassette", "lp", "ep", "sacd"]:
            is_video = False
        else:
            is_video = None

        if is_video is not None:
            tracks = (
                db.query(models.AlbumTrack)
                .filter(models.AlbumTrack.album_id == disc.album_id, models.AlbumTrack.disc_number == disc.disc_number)
                .all()
            )

            if tracks:
                song_ids = list(set([t.song_id for t in tracks]))
                db.query(models.Song).filter(models.Song.id.in_(song_ids)).update(
                    {"is_video": is_video}, synchronize_session=False
                )

    if request.edition is not None:
        disc.edition = request.edition

    db.commit()
    db.refresh(disc)
    return disc


# [DELETE] /albums/{album_id}
# ----------------------------------------------------
@router.delete("/{album_id}")
def delete_album(album_id: int, db: Session = Depends(get_db)):
    """
    特定のアルバム（エディション）を削除します。
    """
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="対象のアルバムが見つかりません。")

    old_album_group_id = album.album_group_id

    # 紐づくAlbumTrackとAlbumDiscを削除
    db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album.id).delete()
    db.query(models.AlbumDisc).filter(models.AlbumDisc.album_id == album.id).delete()

    # Album自身を削除
    db.delete(album)
    db.commit()

    # 所属していたAlbumGroupが空になった場合は削除
    if old_album_group_id:
        remaining = db.query(models.Album).filter(models.Album.album_group_id == old_album_group_id).count()
        if remaining == 0:
            old_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == old_album_group_id).first()
            if old_group:
                db.delete(old_group)
                db.commit()

    return {"status": "success"}


# [POST] /albums/{album_id}/discs/{disc_number}/merge
# ----------------------------------------------------
@router.post("/{album_id}/discs/{disc_number}/merge")
def bulk_merge_disc(
    album_id: int, disc_number: int, request: schemas.BulkDiscMergeRequest, db: Session = Depends(get_db)
):
    """
    指定されたディスク（album_id, disc_number）に含まれるすべてのトラックを、
    別のエディション（target_album_id）の楽曲に一括統合します。
    target_disc_number が指定されている場合はそのディスク内で、未指定の場合は全ディスクから
    曲名とバージョン名が一致するものを探してマージします。
    """
    import unicodedata

    from backend.routers.songs import perform_song_merge

    source_tracks = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number == disc_number)
        .all()
    )

    query = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == request.target_album_id)
    if request.target_disc_number is not None:
        query = query.filter(models.AlbumTrack.disc_number == request.target_disc_number)
    target_tracks = query.all()

    if not source_tracks:
        raise HTTPException(status_code=404, detail="Source tracks not found.")
    if not target_tracks:
        raise HTTPException(status_code=404, detail="Target tracks not found.")

    merged_count = 0
    skipped_count = 0

    for s_track in source_tracks:
        source_song = db.query(models.Song).filter(models.Song.id == s_track.song_id).first()
        if not source_song:
            continue

        s_title = unicodedata.normalize("NFKC", source_song.title).lower().replace(" ", "").replace("　", "")
        match_found = False

        for t_track in target_tracks:
            target_song = db.query(models.Song).filter(models.Song.id == t_track.song_id).first()
            if target_song and source_song.id != target_song.id:
                t_title = unicodedata.normalize("NFKC", target_song.title).lower().replace(" ", "").replace("　", "")

                # トラック番号とタイトルの一致、またはタイトルの一致のみでマージを許可（手動インポート等での揺れを吸収するため）
                if s_title == t_title:
                    perform_song_merge(db, source_song, target_song)
                    merged_count += 1
                    match_found = True
                    break  # Stop searching target tracks once matched

        if not match_found:
            skipped_count += 1

    return {
        "message": f"Successfully merged {merged_count} tracks.",
        "merged_count": merged_count,
        "skipped_count": skipped_count,
    }


# [POST] /albums/{album_id}/discs
# ----------------------------------------------------
@router.post("/{album_id}/discs", response_model=schemas.AlbumDiscBase)
def create_album_disc(album_id: int, request: schemas.AlbumDiscCreate, db: Session = Depends(get_db)):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    new_disc = models.AlbumDisc(
        album_id=album_id,
        disc_number=request.disc_number,
        title=request.title,
        media_format=request.media_format,
        edition=request.edition,
    )
    db.add(new_disc)
    db.commit()
    db.refresh(new_disc)

    # メディアフォーマットに基づくis_videoの自動更新
    if request.media_format:
        format_lower = request.media_format.lower()
        if format_lower in ["dvd", "blu-ray", "bd", "blu-ray disc", "video"]:
            is_video = True
        elif format_lower in ["cd", "digital", "vinyl", "cassette", "lp", "ep", "sacd"]:
            is_video = False
        else:
            is_video = None

        if is_video is not None:
            tracks = (
                db.query(models.AlbumTrack)
                .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number == request.disc_number)
                .all()
            )
            if tracks:
                song_ids = list(set([t.song_id for t in tracks]))
                db.query(models.Song).filter(models.Song.id.in_(song_ids)).update(
                    {"is_video": is_video}, synchronize_session=False
                )
                db.commit()

    return new_disc


# [POST] /albums/{album_id}/discs/reorder
# ----------------------------------------------------
@router.post("/{album_id}/discs/reorder", response_model=schemas.Album)
def reorder_album_discs(album_id: int, request: schemas.AlbumDiscReorderRequest, db: Session = Depends(get_db)):
    """
    指定された「元のディスク番号の順序」に従い、ディスクとトラックの disc_number を更新します。
    """
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    old_order = request.original_disc_numbers
    new_order_map = {old_disc: idx + 1 for idx, old_disc in enumerate(old_order)}

    # 影響を受けるディスクとトラックを取得
    discs_to_update = (
        db.query(models.AlbumDisc)
        .filter(models.AlbumDisc.album_id == album_id, models.AlbumDisc.disc_number.in_(old_order))
        .all()
    )

    tracks_to_update = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number.in_(old_order))
        .all()
    )

    # Step 1: Unique制約違反を避けるため、一旦負の値に退避する
    for disc in discs_to_update:
        disc.disc_number = -disc.disc_number
    for track in tracks_to_update:
        track.disc_number = -track.disc_number

    db.commit()

    # Step 2: 負の値から新しい正のディスク番号に更新する
    for disc in discs_to_update:
        old_disc = -disc.disc_number
        if old_disc in new_order_map:
            disc.disc_number = new_order_map[old_disc]

    for track in tracks_to_update:
        old_disc = -track.disc_number
        if old_disc in new_order_map:
            track.disc_number = new_order_map[old_disc]

    db.commit()
    db.refresh(album)
    return album


# [POST] /albums/{album_id}/discs/{disc_number}/tracks
# ----------------------------------------------------
@router.post("/{album_id}/discs/{disc_number}/tracks", response_model=schemas.AlbumTrackForAlbum)
def create_album_track(
    album_id: int, disc_number: int, request: schemas.AlbumTrackCreate, db: Session = Depends(get_db)
):
    # Verify song exists
    song = db.query(models.Song).filter(models.Song.id == request.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    new_track = models.AlbumTrack(
        album_id=album_id,
        disc_number=disc_number,
        song_id=request.song_id,
        track_number=request.track_number,
        display_title=request.display_title,
        notes=request.notes,
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)
    return new_track


# [DELETE] /albums/tracks/{track_id}
# ----------------------------------------------------
@router.delete("/tracks/{track_id}")
def delete_album_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(models.AlbumTrack).filter(models.AlbumTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    db.delete(track)
    db.commit()
    return {"status": "success"}


# [DELETE] /albums/{album_id}/discs/{disc_id}
# ----------------------------------------------------
@router.delete("/{album_id}/discs/{disc_id}")
def delete_album_disc(album_id: int, disc_id: int, db: Session = Depends(get_db)):
    disc = (
        db.query(models.AlbumDisc).filter(models.AlbumDisc.id == disc_id, models.AlbumDisc.album_id == album_id).first()
    )
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")

    db.delete(disc)
    db.commit()
    return {"status": "success"}


# [POST] /albums/{album_id}/discs/{disc_id}/merge-up
# ----------------------------------------------------
@router.post("/{album_id}/discs/{disc_id}/merge-up")
def merge_album_disc_up(album_id: int, disc_id: int, db: Session = Depends(get_db)):
    # 対象ディスクを取得
    target_disc = (
        db.query(models.AlbumDisc).filter(models.AlbumDisc.id == disc_id, models.AlbumDisc.album_id == album_id).first()
    )
    if not target_disc:
        raise HTTPException(status_code=404, detail="Disc not found")

    # 前のディスクを取得
    prev_disc = (
        db.query(models.AlbumDisc)
        .filter(models.AlbumDisc.album_id == album_id, models.AlbumDisc.disc_number < target_disc.disc_number)
        .order_by(models.AlbumDisc.disc_number.desc())
        .first()
    )

    if not prev_disc:
        raise HTTPException(status_code=400, detail="Cannot merge because there is no previous disc")

    # 前のディスクの最大トラック番号を取得
    max_track = (
        db.query(func.max(models.AlbumTrack.track_number))
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number == prev_disc.disc_number)
        .scalar()
        or 0
    )

    # 対象ディスクのトラックを更新
    target_tracks = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number == target_disc.disc_number)
        .all()
    )

    # 【修正】対象を先にすべてメモリ上に取得しておく（Identity Mapによるバグ回避）
    shift_discs = (
        db.query(models.AlbumDisc)
        .filter(models.AlbumDisc.album_id == album_id, models.AlbumDisc.disc_number > target_disc.disc_number)
        .all()
    )
    shift_tracks = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number > target_disc.disc_number)
        .all()
    )

    # UNIQUE制約を回避するため一時的に大きな値に退避
    for track in target_tracks:
        track.disc_number += 1000
    db.flush()

    for track in target_tracks:
        track.disc_number = prev_disc.disc_number
        track.track_number += max_track

    # 以降のトラック・ディスクの連番を前倒しする
    for d in shift_discs:
        d.disc_number += 1000
    for t in shift_tracks:
        t.disc_number += 1000
    db.flush()

    for d in shift_discs:
        d.disc_number -= 1001
    for t in shift_tracks:
        t.disc_number -= 1001
    db.flush()

    # 対象ディスク自体を削除
    db.delete(target_disc)

    db.commit()
    return {"status": "success"}


# [POST] /albums/{album_id}/discs/{disc_number}/split
# ----------------------------------------------------
@router.post("/{album_id}/discs/{disc_number}/split", response_model=schemas.Album)
def split_album_disc(
    album_id: int, disc_number: int, split_from_track_number: int = Body(..., embed=True), db: Session = Depends(get_db)
):
    """
    指定したトラック番号以降のトラックを次のディスク(disc_number + 1)に移動します。
    """
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # 以降のディスク番号をずらす処理
    existing_discs = (
        db.query(models.AlbumDisc)
        .filter(models.AlbumDisc.album_id == album_id, models.AlbumDisc.disc_number > disc_number)
        .order_by(models.AlbumDisc.disc_number.desc())
        .all()
    )

    for d in existing_discs:
        d.disc_number += 1000

    existing_tracks_to_shift = (
        db.query(models.AlbumTrack)
        .filter(models.AlbumTrack.album_id == album_id, models.AlbumTrack.disc_number > disc_number)
        .all()
    )

    for t in existing_tracks_to_shift:
        t.disc_number += 1000

    db.flush()

    for d in existing_discs:
        d.disc_number -= 999
    for t in existing_tracks_to_shift:
        t.disc_number -= 999

    db.flush()

    # 新しいディスクを作成
    new_disc = models.AlbumDisc(album_id=album_id, disc_number=disc_number + 1, title=None, media_format="CD")
    # 元のディスクのフォーマットを引き継ぐ
    orig_disc = (
        db.query(models.AlbumDisc)
        .filter(models.AlbumDisc.album_id == album_id, models.AlbumDisc.disc_number == disc_number)
        .first()
    )
    if orig_disc:
        new_disc.media_format = orig_disc.media_format

    db.add(new_disc)

    # 対象のトラックを移動
    tracks_to_move = (
        db.query(models.AlbumTrack)
        .filter(
            models.AlbumTrack.album_id == album_id,
            models.AlbumTrack.disc_number == disc_number,
            models.AlbumTrack.track_number >= split_from_track_number,
        )
        .order_by(models.AlbumTrack.track_number.asc())
        .all()
    )

    if not tracks_to_move:
        raise HTTPException(status_code=400, detail="指定されたトラック番号以降のトラックが存在しません。")

    for t in tracks_to_move:
        t.disc_number += 1000
    db.flush()

    # track_number を1から振り直す
    for i, t in enumerate(tracks_to_move, start=1):
        t.disc_number = disc_number + 1
        t.track_number = i

    db.commit()
    db.refresh(album)
    return album


# [POST] /albums/{album_id}/discs/{disc_number}/tracks/{track_number}/split
# ----------------------------------------------------
@router.post("/{album_id}/discs/{disc_number}/tracks/{track_number}/split", response_model=schemas.SongMini)
def split_album_track_to_new_version(album_id: int, disc_number: int, track_number: int, db: Session = Depends(get_db)):
    """
    指定されたアルバムトラックを現在のSongから切り離し、同じMusicalWorkに属する新しいSong（バージョン）として分割します。
    誤って別のバージョンを同じSongとして統合してしまった場合に使用します。
    """
    track = (
        db.query(models.AlbumTrack)
        .filter(
            models.AlbumTrack.album_id == album_id,
            models.AlbumTrack.disc_number == disc_number,
            models.AlbumTrack.track_number == track_number,
        )
        .first()
    )

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    old_song = db.query(models.Song).filter(models.Song.id == track.song_id).first()
    if not old_song:
        raise HTTPException(status_code=404, detail="Original song not found")

    # 新しいSong（バージョン）を作成
    new_song = models.Song(
        title=old_song.title,
        work_id=old_song.work_id,
        is_video=old_song.is_video,
        # spotify_song_id などは引き継がない（別のバージョンのため）
    )
    db.add(new_song)
    db.flush()  # new_song.idを取得するため

    # トラックの紐付けを新しいSongに変更
    track.song_id = new_song.id
    db.commit()
    db.refresh(new_song)

    return schemas.SongMini.model_validate(new_song)


# --- ★アルバム/ディスク単位でtrack_categoryを一括設定するAPI★ ---


class BulkCategoryRequest(BaseModel):
    track_category: str | None = None
    disc_number: int | None = None  # Noneの場合はアルバム全体


@router.post("/{album_id}/bulk-set-category")
def bulk_set_track_category(
    album_id: int,
    req: BulkCategoryRequest,
    db: Session = Depends(get_db),
):
    """
    指定アルバム（またはそのディスク）に収録されたすべての楽曲に
    track_category を一括設定します。
    disc_number が指定された場合はそのディスクのみ対象。
    """
    query = (
        db.query(models.Song)
        .join(models.AlbumTrack, models.AlbumTrack.song_id == models.Song.id)
        .filter(models.AlbumTrack.album_id == album_id)
    )
    if req.disc_number is not None:
        query = query.filter(models.AlbumTrack.disc_number == req.disc_number)

    songs = query.all()
    if not songs:
        raise HTTPException(status_code=404, detail="対象楽曲が見つかりません")

    for song in songs:
        song.track_category = req.track_category

    db.commit()
    return {"updated": len(songs), "track_category": req.track_category}
