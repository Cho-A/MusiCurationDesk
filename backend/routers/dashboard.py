from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func

from backend.dependencies import get_db

from .. import dependencies, models, schemas


class DashboardRecentResponse(BaseModel):
    recent_albums: List[schemas.AlbumCardData]
    recent_songs: List[schemas.SongCardData]


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """ダッシュボード用の全体KPIを取得する"""
    total_songs = db.query(models.Song).count()
    total_artists = db.query(models.Artist).count()
    total_albums = db.query(models.Album).count()
    total_performances = db.query(models.Performance).count()

    return {
        "total_songs": total_songs,
        "total_artists": total_artists,
        "total_albums": total_albums,
        "total_performances": total_performances,
    }


@router.get("/recent", response_model=DashboardRecentResponse)
def get_recent_additions(db: Session = Depends(get_db)):
    """最近追加されたアルバムと楽曲を取得する"""
    recent_albums = (
        db.query(models.Album)
        .options(joinedload(models.Album.artist), joinedload(models.Album.album_group))
        .order_by(models.Album.id.desc())
        .limit(10)
        .all()
    )

    recent_songs = (
        db.query(models.Song)
        .options(
            joinedload(models.Song.artist_links).joinedload(models.SongArtistLink.artist),
            joinedload(models.Song.work)
            .joinedload(models.MusicalWork.artist_links)
            .joinedload(models.WorkArtistLink.artist),
            joinedload(models.Song.album_links)
            .joinedload(models.AlbumTrack.album)
            .joinedload(models.Album.album_group),
        )
        .order_by(models.Song.id.desc())
        .limit(10)
        .all()
    )

    return {"recent_albums": recent_albums, "recent_songs": recent_songs}


@router.get("/discovery")
def get_random_discovery(db: Session = Depends(get_db)):
    """ライブラリからランダムに1曲を取得する (Today's Discovery用)"""
    # func.random() を使ってランダムに1件取得
    random_song = db.query(models.Song).order_by(func.random()).first()

    if not random_song:
        return None

    # もし可能であれば、その曲が所属するアルバムのジャケット画像を取得したい
    # 今回は簡易的に、最初の関連アルバムトラックから取得する
    cover_image_url = None
    album_title = None

    first_album_track = db.query(models.AlbumTrack).filter(models.AlbumTrack.song_id == random_song.id).first()
    if first_album_track and first_album_track.album:
        cover_image_url = first_album_track.album.cover_image_url
        album_title = first_album_track.album.main_title

    return {
        "id": random_song.id,
        "title": random_song.title,
        "album_title": album_title,
        "cover_image_url": cover_image_url,
    }


@router.get("/stats/me")
def get_personal_dashboard_stats(
    db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    """ログインユーザー専用のKPIを取得する"""

    # 1. 所有アルバム数
    total_albums = (
        db.query(models.UserPossession)
        .filter(models.UserPossession.user_id == current_user.id, models.UserPossession.entity_type == "album")
        .count()
    )

    # 2. 参加ライブ数
    total_performances = (
        db.query(models.UserAttendance).filter(models.UserAttendance.user_id == current_user.id).count()
    )

    # 3. ライブで聞いた総楽曲数（総体験数）
    # UserAttendance に紐づく Performance の SetlistEntry をカウント
    total_songs_experienced = (
        db.query(models.SetlistEntry)
        .join(models.Performance, models.SetlistEntry.performance_id == models.Performance.id)
        .join(models.UserAttendance, models.Performance.id == models.UserAttendance.performance_id)
        .filter(models.UserAttendance.user_id == current_user.id)
        .count()
    )

    # 4. ライブで聞いたユニーク楽曲数
    # song_id があるものをdistinctカウント
    unique_songs_experienced = (
        db.query(func.count(func.distinct(models.SetlistEntry.song_id)))
        .join(models.Performance, models.SetlistEntry.performance_id == models.Performance.id)
        .join(models.UserAttendance, models.Performance.id == models.UserAttendance.performance_id)
        .filter(models.UserAttendance.user_id == current_user.id, models.SetlistEntry.song_id.isnot(None))
        .scalar()
        or 0
    )

    return {
        "total_albums": total_albums,
        "total_performances": total_performances,
        "total_songs_experienced": total_songs_experienced,
        "unique_songs_experienced": unique_songs_experienced,
    }


@router.get("/recent/me", response_model=DashboardRecentResponse)
def get_personal_recent_additions(
    db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    """ユーザーが関心のあるアーティスト（CD所有またはライブ参加）に関連する最近の追加データを取得する"""

    # 1. 関心のあるアーティストIDの抽出
    artist_ids = set()

    # 参加したライブのアーティスト
    attended_performances = (
        db.query(models.Performance)
        .join(models.UserAttendance, models.Performance.id == models.UserAttendance.performance_id)
        .filter(models.UserAttendance.user_id == current_user.id)
        .all()
    )

    for perf in attended_performances:
        for roster in perf.roster_entries:
            artist_ids.add(roster.artist_id)

    # 所有しているアルバムのアーティスト (今回は簡略化のためライブ参加のみで抽出)

    artist_ids_list = list(artist_ids)

    # 2. アーティストに紐づく最近のアルバムを取得 (最大10件)
    if not artist_ids_list:
        # 関心アーティストがいない場合は全体の recent を返す
        return get_recent_additions(db)

    recent_albums = (
        db.query(models.Album)
        .options(joinedload(models.Album.artist), joinedload(models.Album.album_group))
        .filter(models.Album.artist_id.in_(artist_ids_list))
        .order_by(models.Album.id.desc())
        .limit(10)
        .all()
    )

    # 3. アーティストに紐づく最近の楽曲を取得 (最大10件)
    recent_songs = (
        db.query(models.Song)
        .options(
            joinedload(models.Song.artist_links).joinedload(models.SongArtistLink.artist),
            joinedload(models.Song.work)
            .joinedload(models.MusicalWork.artist_links)
            .joinedload(models.WorkArtistLink.artist),
            joinedload(models.Song.album_links)
            .joinedload(models.AlbumTrack.album)
            .joinedload(models.Album.album_group),
        )
        .join(models.SongArtistLink, models.Song.id == models.SongArtistLink.song_id)
        .filter(models.SongArtistLink.artist_id.in_(artist_ids_list))
        .order_by(models.Song.id.desc())
        .limit(10)
        .all()
    )

    return {"recent_albums": recent_albums, "recent_songs": recent_songs}
