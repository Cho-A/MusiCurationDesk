from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.dependencies import get_db

router = APIRouter(prefix="/credits", tags=["Credits"])


def get_or_create_artist(db: Session, name: str) -> models.Artist:
    """名前からアーティストを取得、存在しなければ作成する"""
    name = name.strip()
    artist = db.query(models.Artist).filter(func.lower(models.Artist.name) == func.lower(name)).first()
    if not artist:
        artist = models.Artist(name=name)
        db.add(artist)
        db.flush()
    return artist


@router.get("/bulk-edit", response_model=List[schemas.CreditBulkEditItem])
def get_bulk_edit_credits(
    album_id: int = Query(None, description="アルバムIDで絞り込む場合"),
    artist_id: int = Query(None, description="メインアーティストIDで絞り込む場合"),
    db: Session = Depends(get_db),
):
    """
    指定されたアルバム、またはアーティストに紐づく楽曲の現在のクレジット（作詞・作曲・編曲）一覧を返す。
    """
    if not album_id and not artist_id:
        raise HTTPException(status_code=400, detail="album_id か artist_id のいずれかを指定してください。")

    query = db.query(models.Song)

    if album_id:
        query = query.join(models.AlbumTrack).filter(models.AlbumTrack.album_id == album_id)
        # トラック順にソートしたい場合は追加
        query = query.order_by(models.AlbumTrack.disc_number, models.AlbumTrack.track_number)
    elif artist_id:
        query = (
            query.join(models.SongArtistLink)
            .filter(models.SongArtistLink.artist_id == artist_id, models.SongArtistLink.role_category == "Artist")
            .order_by(models.Song.id)
        )

    songs = query.all()

    results = []
    for song in songs:
        lyricists = []
        composers = []
        arrangers = []

        # 作詞・作曲は WorkArtistLink から取得
        if song.work:
            for link in song.work.artist_links:
                if link.role_category == "Lyricist" and link.artist:
                    lyricists.append(link.artist.name)
                elif link.role_category == "Composer" and link.artist:
                    composers.append(link.artist.name)

        # 編曲は SongArtistLink から取得
        for link in song.artist_links:
            if link.role_category == "Arranger" and link.artist:
                arrangers.append(link.artist.name)

        results.append(
            schemas.CreditBulkEditItem(
                song_id=song.id, title=song.title, lyricists=lyricists, composers=composers, arrangers=arrangers
            )
        )

    return results


@router.post("/bulk-update")
def update_bulk_credits(req: schemas.CreditBulkUpdateRequest, db: Session = Depends(get_db)):
    """
    複数曲のクレジット（作詞・作曲・編曲）を一括で上書き更新する。
    """
    # 同じ WorkArtistLink を複数曲が共有している場合に重複が生じないよう、
    # 処理済みの work_id を追跡する。
    processed_work_ids: set[int] = set()

    try:
        for update_item in req.updates:
            song = db.query(models.Song).filter(models.Song.id == update_item.song_id).first()
            if not song:
                continue

            # --- 編曲(Arranger)の更新（SongArtistLink）---
            db.query(models.SongArtistLink).filter(
                models.SongArtistLink.song_id == song.id, models.SongArtistLink.role_category == "Arranger"
            ).delete(synchronize_session="fetch")
            db.flush()  # DELETE を即時DBへ反映してから INSERT する

            seen_arrangers: set[int] = set()
            for name in update_item.arrangers:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                if artist.id in seen_arrangers:
                    continue
                seen_arrangers.add(artist.id)
                db.add(
                    models.SongArtistLink(
                        song_id=song.id, artist_id=artist.id, role_category="Arranger", role_detail=None
                    )
                )
            db.flush()

            # --- 作詞(Lyricist)・作曲(Composer)の更新（WorkArtistLink）---
            work = song.work
            if not work:
                song_work_link = db.query(models.SongWorksLink).filter(models.SongWorksLink.song_id == song.id).first()
                if song_work_link:
                    work = song_work_link.work
                    song.work_id = work.id
                else:
                    work = models.MusicalWork(title=song.title)
                    db.add(work)
                    db.flush()
                    song.work_id = work.id
                    db.add(models.SongWorksLink(song_id=song.id, work_id=work.id, order_index=0))
                    db.flush()

            # 同じWorkを複数の楽曲が共有しているケースを考慮し、
            # 既に処理済みの work_id はスキップする
            if work.id in processed_work_ids:
                continue
            processed_work_ids.add(work.id)

            db.query(models.WorkArtistLink).filter(
                models.WorkArtistLink.work_id == work.id,
                models.WorkArtistLink.role_category.in_(["Lyricist", "Composer"]),
            ).delete(synchronize_session="fetch")
            db.flush()  # DELETE を即時DBへ反映してから INSERT する

            seen_lyricists: set[int] = set()
            for name in update_item.lyricists:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                if artist.id in seen_lyricists:
                    continue
                seen_lyricists.add(artist.id)
                db.add(
                    models.WorkArtistLink(
                        work_id=work.id, artist_id=artist.id, role_category="Lyricist", role_detail=None
                    )
                )

            seen_composers: set[int] = set()
            for name in update_item.composers:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                if artist.id in seen_composers:
                    continue
                seen_composers.add(artist.id)
                db.add(
                    models.WorkArtistLink(
                        work_id=work.id, artist_id=artist.id, role_category="Composer", role_detail=None
                    )
                )
            db.flush()

        db.commit()
        return {"message": "Credits successfully updated in bulk."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-to-artist")
def apply_credits_to_artist(req: schemas.ArtistCreditApplyRequest, db: Session = Depends(get_db)):
    """
    特定アーティストのメインアーティスト楽曲、または特定アルバムの収録曲すべてに、
    指定したクレジットを一括で適用する。
    overwrite_* フラグが True のフィールドのみ上書きされる。
    """
    if req.artist_id is None and req.album_id is None:
        raise HTTPException(status_code=400, detail="artist_id か album_id のいずれかを指定してください。")

    # ── 重複なし楽曲 ID リストの取得 ──────────────────────────────────────────
    # .distinct() は JOIN 先の列も含めて評価されるため ORM レベルでは不十分。
    # サブクエリで先に song_id の集合を作り、そこから Song を取得する。
    if req.album_id is not None:
        unique_song_id_rows = (
            db.query(models.AlbumTrack.song_id)
            .filter(models.AlbumTrack.album_id == req.album_id, models.AlbumTrack.song_id.isnot(None))
            .distinct()
            .all()
        )
    else:
        unique_song_id_rows = (
            db.query(models.SongArtistLink.song_id)
            .filter(models.SongArtistLink.artist_id == req.artist_id)
            .distinct()
            .all()
        )
    unique_song_ids = [r[0] for r in unique_song_id_rows]

    if req.target_song_ids is not None:
        unique_song_ids = [sid for sid in unique_song_ids if sid in req.target_song_ids]

    if not unique_song_ids:
        return {"message": "対象の楽曲がありません。"}

    songs = db.query(models.Song).filter(models.Song.id.in_(unique_song_ids)).all()

    arranger_ids_to_add: list[int] = []
    if req.overwrite_arrangers:
        seen: set[str] = set()
        for name in req.arrangers:
            name = name.strip()
            if name and name not in seen:
                seen.add(name)
                artist_obj = get_or_create_artist(db, name)
                arranger_ids_to_add.append(artist_obj.id)
        db.flush()

    lyricist_ids_to_add: list[int] = []
    if req.overwrite_lyricists:
        seen = set()
        for name in req.lyricists:
            name = name.strip()
            if name and name not in seen:
                seen.add(name)
                artist_obj = get_or_create_artist(db, name)
                lyricist_ids_to_add.append(artist_obj.id)
        db.flush()

    composer_ids_to_add: list[int] = []
    if req.overwrite_composers:
        seen = set()
        for name in req.composers:
            name = name.strip()
            if name and name not in seen:
                seen.add(name)
                artist_obj = get_or_create_artist(db, name)
                composer_ids_to_add.append(artist_obj.id)
        db.flush()

    custom_role_data = []
    for crole in req.custom_roles:
        c_artist_ids = []
        c_seen = set()
        for name in crole.artists:
            name = name.strip()
            if name and name not in c_seen:
                c_seen.add(name)
                artist_obj = get_or_create_artist(db, name)
                c_artist_ids.append(artist_obj.id)
        custom_role_data.append(
            {"category": crole.role_category, "artist_ids": c_artist_ids, "overwrite": crole.overwrite}
        )
    db.flush()

    updated_songs = 0
    processed_work_ids: set[int] = set()

    try:
        for song in songs:
            # ── 編曲 (SongArtistLink) ─────────────────────────────────────────
            if req.overwrite_arrangers:
                db.query(models.SongArtistLink).filter(
                    models.SongArtistLink.song_id == song.id,
                    models.SongArtistLink.role_category == "Arranger",
                ).delete(synchronize_session="fetch")
                db.flush()  # DELETE を即時反映
                for artist_id in arranger_ids_to_add:
                    db.add(
                        models.SongArtistLink(
                            song_id=song.id, artist_id=artist_id, role_category="Arranger", role_detail=None
                        )
                    )
                db.flush()

            # ── カスタムロール (SongArtistLink) ──────────────────────────────
            for crole in custom_role_data:
                if crole["overwrite"]:
                    db.query(models.SongArtistLink).filter(
                        models.SongArtistLink.song_id == song.id,
                        models.SongArtistLink.role_category == crole["category"],
                    ).delete(synchronize_session="fetch")
                    db.flush()
                for artist_id in crole["artist_ids"]:
                    db.add(
                        models.SongArtistLink(
                            song_id=song.id, artist_id=artist_id, role_category=crole["category"], role_detail=None
                        )
                    )
                db.flush()

            # ── 作詞・作曲 (WorkArtistLink) ───────────────────────────────────
            if req.overwrite_lyricists or req.overwrite_composers:
                work = song.work
                if not work:
                    song_work_link = (
                        db.query(models.SongWorksLink).filter(models.SongWorksLink.song_id == song.id).first()
                    )
                    if song_work_link:
                        work = song_work_link.work
                        song.work_id = work.id
                    else:
                        work = models.MusicalWork(title=song.title)
                        db.add(work)
                        db.flush()
                        song.work_id = work.id
                        db.add(models.SongWorksLink(song_id=song.id, work_id=work.id, order_index=0))
                        db.flush()

                # 同一 work を共有する楽曲が複数ある場合、2度目以降はスキップ
                if work.id in processed_work_ids:
                    updated_songs += 1
                    continue
                processed_work_ids.add(work.id)

                roles_to_clear = []
                if req.overwrite_lyricists:
                    roles_to_clear.append("Lyricist")
                if req.overwrite_composers:
                    roles_to_clear.append("Composer")

                if roles_to_clear:
                    db.query(models.WorkArtistLink).filter(
                        models.WorkArtistLink.work_id == work.id,
                        models.WorkArtistLink.role_category.in_(roles_to_clear),
                    ).delete(synchronize_session="fetch")
                    db.flush()  # DELETE を即時反映

                for artist_id in lyricist_ids_to_add:
                    db.add(
                        models.WorkArtistLink(
                            work_id=work.id, artist_id=artist_id, role_category="Lyricist", role_detail=None
                        )
                    )
                for artist_id in composer_ids_to_add:
                    db.add(
                        models.WorkArtistLink(
                            work_id=work.id, artist_id=artist_id, role_category="Composer", role_detail=None
                        )
                    )
                db.flush()

            updated_songs += 1

        db.commit()
        return {"message": f"{updated_songs} 曲のクレジットを一括適用しました。", "updated_count": updated_songs}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
