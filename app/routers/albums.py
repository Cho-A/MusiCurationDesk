from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from .. import models , schemas # 先ほど作成したファイルをインポート

album_router = APIRouter(
    prefix="/albums", 
    tags=["Albums"] 
)

album_track_router = APIRouter(
    prefix="/album_tracks", 
    tags=["Albums"] 
)

album_relatinship_router = APIRouter(
    prefix="/album_relationships", 
    tags=["Albums"] 
)


# --- ★アルバムマスター登録APIエンドポイント★ ---
#
# [POST] /albums/
# ----------------------------------------------------
@album_router.post("/", response_model=schemas.Album, tags=["Albums"])
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
@album_track_router.post("/", response_model=schemas.AlbumTrack, tags=["Albums"])
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
@album_relatinship_router.post("/", response_model=schemas.AlbumRelationship, tags=["Albums"])
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