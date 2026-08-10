from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

router = APIRouter()


# --- ★アルバムマスター登録APIエンドポイント★ ---
#
# [POST] /albums/
# ----------------------------------------------------
@router.post("/albums", response_model=schemas.Album, tags=["Albums"])
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
    album_data = album.dict()
    if not album_data.get('album_group_id'):
        db_album_group = models.AlbumGroup(
            title=album.main_title,
            artist_id=album.artist_id,
            release_date=album.physical_release_date or album.digital_release_date,
            album_type=album.album_type,
            cover_image_url=album.cover_image_url
        )
        db.add(db_album_group)
        db.commit()
        db.refresh(db_album_group)
        album_data['album_group_id'] = db_album_group.id
        
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
@router.get("/albums", response_model=List[schemas.Album], tags=["Albums"])
def get_all_albums(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(models.get_db)
):
    """
    全アルバムの一覧を取得します。
    """
    return db.query(models.Album).order_by(models.Album.id.desc()).offset(skip).limit(limit).all()

# [GET] /albums/{album_id}
# ----------------------------------------------------
@router.get("/albums/{album_id}", response_model=schemas.AlbumDetail, tags=["Albums"])
def get_album_by_id(album_id: int, db: Session = Depends(models.get_db)):
    """
    指定されたIDのアルバム詳細情報を取得します。
    収録されている楽曲（トラック）も同時に取得します。
    """
    album = db.query(models.Album)\
        .options(
            joinedload(models.Album.artist),
            joinedload(models.Album.album_tracks)\
            .joinedload(models.AlbumTrack.song)
        )\
        .filter(models.Album.id == album_id)\
        .first()
        
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")
    return album

# [POST] /album_tracks/
# ----------------------------------------------------
@router.post("/album_tracks", response_model=schemas.AlbumTrack, tags=["Albums"])
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
@router.post("/album_relationships", response_model=schemas.AlbumRelationship, tags=["Albums"])
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


# [POST] /albums/import-cd
# ----------------------------------------------------
@router.post("/albums/import-cd", response_model=schemas.Album, tags=["Albums"])
def import_cd_album(
    request: schemas.CDImportRequest,
    db: Session = Depends(models.get_db)
):
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
                album_type=request.album_type
            )
            db.add(db_album_group)
            db.commit()
            db.refresh(db_album_group)
            
            album = models.Album(
                main_title=request.title,
                physical_release_date=request.release_date,
                album_type=request.album_type,
                album_group_id=db_album_group.id
            )
            db.add(album)
            db.commit()
            db.refresh(album)
        else:
            # 上書きの場合
            album = db.query(models.Album).filter(models.Album.id == request.target_album_id).first()
            if not album:
                raise HTTPException(status_code=404, detail="対象のアルバムが見つかりません。")
            
            # 既存のトラックとディスクをすべて削除して上書き
            db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album.id).delete()
            db.query(models.AlbumDisc).filter(models.AlbumDisc.album_id == album.id).delete()
            
            # アルバムメタデータを更新
            album.main_title = request.title
            if request.release_date:
                album.physical_release_date = request.release_date
            if request.album_type:
                album.album_type = request.album_type
            album.total_tracks = len(request.tracks)
            db.commit()

        # ディスク情報の保存
        for disc_req in request.discs:
            album_disc = models.AlbumDisc(
                album_id=album.id,
                disc_number=disc_req.disc_number,
                title=disc_req.title,
                media_format=disc_req.media_format,
                edition=disc_req.edition
            )
            db.add(album_disc)
        
        # トラックリストを登録
        for track_req in request.tracks:
            song_id = track_req.song_id
            
            # サブスク未解禁曲（song_idがnull）の場合は新規にSongレコードを作成
            if not song_id:
                new_song = models.Song(
                    title=track_req.title,
                    spotify_song_id=None
                )
                db.add(new_song)
                db.flush()
                song_id = new_song.id
                
            # AlbumTrackを作成
            album_track = models.AlbumTrack(
                album_id=album.id,
                song_id=song_id,
                disc_number=track_req.disc_number,
                track_number=track_req.track_number,
                media_format=track_req.media_format,
                notes=track_req.notes,
                display_title=track_req.display_title or track_req.title
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
@router.put("/albums/{album_id}/tracks/{track_id}", response_model=schemas.AlbumTrack, tags=["Albums"])
def update_album_track(
    album_id: int,
    track_id: int,
    request: schemas.AlbumTrackUpdate,
    db: Session = Depends(models.get_db)
):
    """
    アルバム内の特定のトラックのメタデータ（表示名や備考など）を更新します。
    """
    track = db.query(models.AlbumTrack).filter(
        models.AlbumTrack.id == track_id,
        models.AlbumTrack.album_id == album_id
    ).first()
    
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
    if request.is_unreleased is not None:
        track.is_unreleased = request.is_unreleased
        
    db.commit()
    db.refresh(track)
    return track

# [PUT] /albums/{album_id}
# ----------------------------------------------------
@router.put("/albums/{album_id}", response_model=schemas.Album, tags=["Albums"])
def update_album(
    album_id: int,
    request: schemas.AlbumUpdate,
    db: Session = Depends(models.get_db)
):
    """
    アルバムメタデータを更新します。
    """
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="対象のアルバムが見つかりません。")
        
    
    old_album_group_id = album.album_group_id
    group_changed = False
    
    if request.main_title is not None: album.main_title = request.main_title
    if request.version_title is not None: album.version_title = request.version_title
    if request.artist_id is not None: album.artist_id = request.artist_id
    if request.physical_release_date is not None: album.physical_release_date = request.physical_release_date
    if request.digital_release_date is not None: album.digital_release_date = request.digital_release_date
    if request.spotify_album_id is not None: album.spotify_album_id = request.spotify_album_id
    if request.cover_image_url is not None: album.cover_image_url = request.cover_image_url
    if request.album_type is not None: album.album_type = request.album_type
    
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


# [PUT] /albums/{album_id}/discs/{disc_id}
# ----------------------------------------------------
@router.put("/albums/{album_id}/discs/{disc_id}", response_model=schemas.AlbumDiscBase, tags=["Albums"])
def update_album_disc(
    album_id: int,
    disc_id: int,
    request: schemas.AlbumDiscUpdate,
    db: Session = Depends(models.get_db)
):
    """
    ディスク情報を更新します（主にタイトル名）。
    """
    disc = db.query(models.AlbumDisc).filter(
        models.AlbumDisc.id == disc_id,
        models.AlbumDisc.album_id == album_id
    ).first()
    
    if not disc:
        raise HTTPException(status_code=404, detail="対象のディスクが見つかりません。")
        
    if request.title is not None: disc.title = request.title
    if request.media_format is not None: disc.media_format = request.media_format
    if request.edition is not None: disc.edition = request.edition
    
    db.commit()
    db.refresh(disc)
    return disc

# [DELETE] /albums/{album_id}
# ----------------------------------------------------
@router.delete("/albums/{album_id}", tags=["Albums"])
def delete_album(
    album_id: int,
    db: Session = Depends(models.get_db)
):
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
@router.post("/albums/{album_id}/discs/{disc_number}/merge", tags=["Albums"])
def bulk_merge_disc(
    album_id: int,
    disc_number: int,
    request: schemas.BulkDiscMergeRequest,
    db: Session = Depends(models.get_db)
):
    """
    指定されたディスク（album_id, disc_number）に含まれるすべてのトラックを、
    別のエディション（target_album_id）の楽曲に一括統合します。
    target_disc_number が指定されている場合はそのディスク内で、未指定の場合は全ディスクから
    曲名とバージョン名が一致するものを探してマージします。
    """
    from backend.routers.songs import perform_song_merge

    source_tracks = db.query(models.AlbumTrack).filter(
        models.AlbumTrack.album_id == album_id,
        models.AlbumTrack.disc_number == disc_number
    ).all()

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
            
        s_title = source_song.title.lower().replace(" ", "").replace("　", "")
        match_found = False

        for t_track in target_tracks:
            target_song = db.query(models.Song).filter(models.Song.id == t_track.song_id).first()
            if target_song and source_song.id != target_song.id:
                t_title = target_song.title.lower().replace(" ", "").replace("　", "")
                if s_title == t_title and source_song.version_name == target_song.version_name:
                    perform_song_merge(db, source_song, target_song)
                    merged_count += 1
                    match_found = True
                    break # Stop searching target tracks once matched
        
        if not match_found:
            skipped_count += 1

    return {
        "message": f"Successfully merged {merged_count} tracks.",
        "merged_count": merged_count,
        "skipped_count": skipped_count
    }

# [POST] /albums/{album_id}/discs
# ----------------------------------------------------
@router.post("/albums/{album_id}/discs", response_model=schemas.AlbumDiscBase, tags=["Albums"])
def create_album_disc(
    album_id: int,
    request: schemas.AlbumDiscCreate,
    db: Session = Depends(models.get_db)
):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
        
    new_disc = models.AlbumDisc(
        album_id=album_id,
        disc_number=request.disc_number,
        title=request.title,
        media_format=request.media_format,
        edition=request.edition
    )
    db.add(new_disc)
    db.commit()
    db.refresh(new_disc)
    return new_disc

# [POST] /albums/{album_id}/discs/{disc_number}/tracks
# ----------------------------------------------------
@router.post("/albums/{album_id}/discs/{disc_number}/tracks", response_model=schemas.AlbumTrackForAlbum, tags=["Albums"])
def create_album_track(
    album_id: int,
    disc_number: int,
    request: schemas.AlbumTrackCreate,
    db: Session = Depends(models.get_db)
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
        is_unreleased=request.is_unreleased
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)
    return new_track

# [DELETE] /albums/tracks/{track_id}
# ----------------------------------------------------
@router.delete("/albums/tracks/{track_id}", tags=["Albums"])
def delete_album_track(
    track_id: int,
    db: Session = Depends(models.get_db)
):
    track = db.query(models.AlbumTrack).filter(models.AlbumTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
        
    db.delete(track)
    db.commit()
    return {"status": "success"}
