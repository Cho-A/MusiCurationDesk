from fastapi import FastAPI
from . import models # 先ほど作成したファイルをインポート
from .routers import songs,artists,links,performances,playlists,tags,tieups,tours,albums,goods_and_stores,users,auth
from fastapi.middleware.cors import CORSMiddleware

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
app.include_router(auth.token_router)
app.include_router(auth.refresh_router)
app.include_router(auth.logout_router)

# ReactアプリのURL（開発中は http://localhost:3000）を許可リストに入れる
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # 許可するオリジン
    allow_credentials=True,     # Cookieや認証ヘッダーの送信を許可（重要！）
    allow_methods=["*"],        # すべてのHTTPメソッドを許可
    allow_headers=["*"],        # すべてのヘッダーを許可
)