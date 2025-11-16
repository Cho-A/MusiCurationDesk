from fastapi import FastAPI, Depends, HTTPException, Response, Query
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, aliased
from . import models , schemas # 先ほど作成したファイルをインポート
from .routers import songs,artists,links,performances,playlists,tags,tieups,tours,albums,goods_and_stores,users


# --- 1. FastAPIアプリの初期化 ---
app = FastAPI(
    title="MusiCuration Desk API",
    description="音楽キュレーションデータベース「MCD」のバックエンドAPI"
)

# --- 2. データベースの初期化 ---
# (最初の起動時にDBとテーブルを作成)
models.create_db_and_tables() 

app.include_router(songs.router)
app.include_router(artists.router)
app.include_router(links.song_artist_router)
app.include_router(links.song_tieup_router)
app.include_router(performances.performance_router)
app.include_router(performances.setlist_entries_router)
app.include_router(performances.performance_roster_router)
app.include_router(tieups.router)
app.include_router(tours.router)
app.include_router(tags.router)
app.include_router(albums.album_router)
app.include_router(albums.album_track_router)
app.include_router(albums.album_relatinship_router)
app.include_router(goods_and_stores.merchandise_router)
app.include_router(goods_and_stores.stores_router)
app.include_router(goods_and_stores.merchandice_relationship_router)
app.include_router(users.user_router)
app.include_router(users.user_possessions_router)
app.include_router(users.user_attendance_router)


