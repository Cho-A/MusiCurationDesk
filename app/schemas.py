from pydantic import BaseModel
from typing import Optional
from datetime import date

# --- Artist (アーティスト) ---

# APIが「受け取る」データの型 (登録時)
class ArtistCreate(BaseModel):
    name: str
    spotify_artist_id: Optional[str] = None
    notes: Optional[str] = None

# APIが「返す」データの型 (登録後・参照時)
class Artist(BaseModel):
    id: int
    name: str
    spotify_artist_id: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        orm_mode = True # SQLAlchemyモデルをPydanticモデルに変換できるようにする


# --- Song (楽曲) ---

# 楽曲登録時にAPIが「受け取る」データの型
class SongCreate(BaseModel):
    title: str
    release_date: Optional[date] = None
    spotify_song_id: Optional[str] = None
    jasrac_code: Optional[str] = None
    jasrac_title: Optional[str] = None
    lyrics: Optional[str] = None

# APIが「返す」データの型 (登録後・参照時)
class Song(BaseModel):
    id: int
    title: str
    release_date: Optional[date] = None
    spotify_song_id: Optional[str] = None
    jasrac_code: Optional[str] = None
    jasrac_title: Optional[str] = None
    # lyrics は重いので返さない (任意)

    class Config:
        orm_mode = True # SQLAlchemyモデルをPydanticモデルに変換