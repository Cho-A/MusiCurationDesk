from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from backend import models, schemas
from backend.dependencies import get_db

router = APIRouter(prefix="/album-groups", tags=["AlbumGroups"])


@router.get("/", response_model=List[schemas.AlbumGroupWithArtist])
def list_album_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    artist_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.AlbumGroup)
    if artist_id is not None:
        query = query.filter(models.AlbumGroup.artist_id == artist_id)
    if q:
        query = query.filter(models.AlbumGroup.title.ilike(f"%{q}%"))

    # Eagerly load the artist so search results can display it
    query = query.options(joinedload(models.AlbumGroup.artist))

    # Sort by release date descending
    query = query.order_by(models.AlbumGroup.release_date.desc().nullslast())

    return query.offset(skip).limit(limit).all()


@router.get("/{group_id}", response_model=schemas.AlbumGroupDetail)
def get_album_group_detail(group_id: int, db: Session = Depends(get_db)):
    # We need to eagerly load artist, albums, albums.artist, albums.discs, albums.album_tracks, albums.album_tracks.song
    group = (
        db.query(models.AlbumGroup)
        .options(
            joinedload(models.AlbumGroup.artist),
            joinedload(models.AlbumGroup.albums).joinedload(models.Album.artist),
            joinedload(models.AlbumGroup.albums).joinedload(models.Album.discs),
            joinedload(models.AlbumGroup.albums)
            .joinedload(models.Album.album_tracks)
            .joinedload(models.AlbumTrack.song),
        )
        .filter(models.AlbumGroup.id == group_id)
        .first()
    )

    if not group:
        raise HTTPException(status_code=404, detail="Album group not found")

    return group


@router.post("/", response_model=schemas.AlbumGroup)
def create_album_group(group: schemas.AlbumGroupCreate, db: Session = Depends(get_db)):
    # .model_dump() for pydantic v1 compatibility which is likely what the project uses
    db_group = models.AlbumGroup(**group.model_dump())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/{group_id}", response_model=schemas.AlbumGroup)
def update_album_group(group_id: int, group_update: schemas.AlbumGroupUpdate, db: Session = Depends(get_db)):
    db_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Album group not found")

    update_data = group_update.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_group, k, v)

    # UIからアルバムグループの発売日が変更された場合、紐づくアルバム（バージョン）の物理/配信発売日にも反映させる
    if "release_date" in update_data:
        albums = db.query(models.Album).filter(models.Album.album_group_id == group_id).all()
        for album in albums:
            album.physical_release_date = update_data["release_date"]
            album.digital_release_date = update_data["release_date"]

    # UIからアルバムグループのメインアーティストが変更された場合、紐づくすべての楽曲のメインアーティストも同期する
    if "artist_id" in update_data and update_data["artist_id"] is not None:
        new_artist_id = update_data["artist_id"]
        # このアルバムグループに属するすべてのアルバムのトラックの楽曲IDを取得
        albums = db.query(models.Album).filter(models.Album.album_group_id == group_id).all()
        album_ids = [a.id for a in albums]
        if album_ids:
            tracks = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id.in_(album_ids)).all()
            song_ids = list(set([t.song_id for t in tracks]))
            if song_ids:
                # 既存の "Artist" ロールのリンクを削除
                db.query(models.SongArtistLink).filter(
                    models.SongArtistLink.song_id.in_(song_ids), models.SongArtistLink.role_category == "Artist"
                ).delete(synchronize_session=False)
                # 新しいアーティストリンクを作成
                new_links = [
                    models.SongArtistLink(song_id=sid, artist_id=new_artist_id, role_category="Artist")
                    for sid in song_ids
                ]
                db.add_all(new_links)

    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/{group_id}")
def delete_album_group(group_id: int, db: Session = Depends(get_db)):
    db_group = db.query(models.AlbumGroup).filter(models.AlbumGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Album group not found")

    # グループに属するすべてのアルバムを取得
    albums = db.query(models.Album).filter(models.Album.album_group_id == group_id).all()
    album_ids = [a.id for a in albums]

    if album_ids:
        # 紐づくAlbumTrackとAlbumDiscを削除
        db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id.in_(album_ids)).delete(synchronize_session=False)
        db.query(models.AlbumDisc).filter(models.AlbumDisc.album_id.in_(album_ids)).delete(synchronize_session=False)

        # 紐づくAlbum自身を削除
        db.query(models.Album).filter(models.Album.album_group_id == group_id).delete(synchronize_session=False)

    # AlbumGroup自身を削除
    db.delete(db_group)
    db.commit()
    return {"ok": True}


@router.post("/{group_id}/merge-editions", tags=["AlbumGroups"])
def merge_editions(group_id: int, request: schemas.BulkEditionMergeRequest, db: Session = Depends(get_db)):
    """
    指定した複数のエディション（ソース）の各トラックを、ターゲットエディションの同ディスク・同トラック番号の楽曲に一括統合します。
    ディスク構成が異なる場合（ソースにのみ存在するディスクなど）、ターゲットに一致するディスクがなければスキップして安全に保持します。
    """
    from backend.routers.songs import perform_song_merge

    # Get target tracks mapped by (disc_number, track_number)
    target_tracks = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == request.target_album_id).all()
    target_track_map = {(t.disc_number, t.track_number): t for t in target_tracks}

    merged_count = 0
    skipped_count = 0

    for source_album_id in request.source_album_ids:
        if source_album_id == request.target_album_id:
            continue

        source_tracks = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == source_album_id).all()

        for s_track in source_tracks:
            t_track = target_track_map.get((s_track.disc_number, s_track.track_number))
            if t_track and s_track.song_id != t_track.song_id:
                source_song = db.query(models.Song).filter(models.Song.id == s_track.song_id).first()
                target_song = db.query(models.Song).filter(models.Song.id == t_track.song_id).first()
                if source_song and target_song:
                    # タイトルの揺れを吸収して比較（大文字小文字、スペース無視）
                    s_title = source_song.title.lower().replace(" ", "").replace("　", "")
                    t_title = target_song.title.lower().replace(" ", "").replace("　", "")

                    if s_title == t_title and source_song.version_name == target_song.version_name:
                        perform_song_merge(db, source_song, target_song)
                        merged_count += 1
                    else:
                        skipped_count += 1

    return {
        "message": f"Successfully merged {merged_count} tracks.",
        "merged_count": merged_count,
        "skipped_count": skipped_count,
    }
