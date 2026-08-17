from __future__ import annotations


from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from . import database
from .routers import (
    album_groups,
    albums,
    artists,
    auth,
    dashboard,
    external,
    external_search,
    goods_and_stores,
    links,
    musicbrainz,
    performances,
    songs,
    tags,
    tieups,
    tours,
    users,
    venues,
    works,
)

# --- 1. FastAPIアプリの初期化 ---
app = FastAPI(
    title="MusiCuration Desk API",
    description="音楽キュレーションデータベース「MCD」のバックエンドAPI",
)

# --- 2. データベースの初期化 ---
# (最初の起動時にDBとテーブルを作成)
database.create_db_and_tables()

app.include_router(songs.router)
app.include_router(artists.router)
app.include_router(links.router)
app.include_router(performances.router)
app.include_router(tieups.router)
app.include_router(tours.router)
app.include_router(external.router)
app.include_router(musicbrainz.router)
app.include_router(works.router)
app.include_router(album_groups.router)
app.include_router(tags.router)
app.include_router(venues.router)
app.include_router(albums.router)
app.include_router(goods_and_stores.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(external_search.router)
app.include_router(dashboard.router)

# ReactアプリのURL（開発中は http://localhost:3000）を許可リストに入れる
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 許可するオリジン
    allow_credentials=True,  # Cookieや認証ヘッダーの送信を許可（重要！）
    allow_methods=["*"],  # すべてのHTTPメソッドを許可
    allow_headers=["*"],  # すべてのヘッダーを許可
)
