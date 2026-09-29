from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

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
    db: Session = Depends(get_db)
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
        query = query.join(models.SongArtistLink).filter(
            models.SongArtistLink.artist_id == artist_id,
            models.SongArtistLink.role_category == "Artist"
        ).order_by(models.Song.id)

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

        results.append(schemas.CreditBulkEditItem(
            song_id=song.id,
            title=song.title,
            lyricists=lyricists,
            composers=composers,
            arrangers=arrangers
        ))

    return results


@router.post("/bulk-update")
def update_bulk_credits(req: schemas.CreditBulkUpdateRequest, db: Session = Depends(get_db)):
    """
    複数曲のクレジット（作詞・作曲・編曲）を一括で上書き更新する。
    """
    try:
        for update_item in req.updates:
            song = db.query(models.Song).filter(models.Song.id == update_item.song_id).first()
            if not song:
                continue

            # --- 編曲(Arranger)の更新 ---
            # まず既存のArrangerを削除
            db.query(models.SongArtistLink).filter(
                models.SongArtistLink.song_id == song.id,
                models.SongArtistLink.role_category == "Arranger"
            ).delete()
            
            # 新しいArrangerを追加
            for name in update_item.arrangers:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                db.add(models.SongArtistLink(
                    song_id=song.id,
                    artist_id=artist.id,
                    role_category="Arranger",
                    role_detail=None
                ))

            # --- 作詞(Lyricist)・作曲(Composer)の更新 ---
            work = song.work
            if not work:
                # Workがない場合は作成
                work = models.MusicalWork(title=song.title)
                db.add(work)
                db.flush()
                db.add(models.SongWorksLink(song_id=song.id, work_id=work.id, order_index=0))
                db.flush()

            # 既存の作詞・作曲を削除
            db.query(models.WorkArtistLink).filter(
                models.WorkArtistLink.work_id == work.id,
                models.WorkArtistLink.role_category.in_(["Lyricist", "Composer"])
            ).delete()

            # 新しいLyricistを追加
            for name in update_item.lyricists:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                db.add(models.WorkArtistLink(
                    work_id=work.id,
                    artist_id=artist.id,
                    role_category="Lyricist",
                    role_detail=None
                ))

            # 新しいComposerを追加
            for name in update_item.composers:
                name = name.strip()
                if not name:
                    continue
                artist = get_or_create_artist(db, name)
                db.add(models.WorkArtistLink(
                    work_id=work.id,
                    artist_id=artist.id,
                    role_category="Composer",
                    role_detail=None
                ))

        db.commit()
        return {"message": "Credits successfully updated in bulk."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
