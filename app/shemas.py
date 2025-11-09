from pydantic import BaseModel
from typing import Optional

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