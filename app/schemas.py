from pydantic import BaseModel, EmailStr, Field
from typing import Optional,List
from datetime import date, time, datetime

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

class AliasInfo(BaseModel):
    alias_name: str
    context: Optional[str]
    
    class Config:
        orm_mode = True

# --- Song Contribution (楽曲貢献情報) ---
class SongContribution(BaseModel):
    song_id: int
    title: str  # 楽曲名
    roles: List[str]  # 役割 (Composer, Vocalist, etc.)
    
    class Config:
        orm_mode = True

# --- Artist Detail (最終応答スキーマ) ---
class ArtistDetail(BaseModel):
    id: int
    name: str
    spotify_artist_id: Optional[str]
    notes: Optional[str]

    # ★ 関連情報をリストとして含める ★
    aliases: List[AliasInfo] = []
    songs_contributed: List[SongContribution] = []

    class Config:
        orm_mode = True
        allow_population_by_field_name = True

# --- ArtistMini (参照用) ---
class ArtistMini(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

# --- Tag (タグ・マスター) ---
class TagCreate(BaseModel):
    name: str # タグ名 (例: "バラード", "ライブ定番曲")
    color: Optional[str] = None # UI用 (例: "#FF0000")

class Tag(BaseModel):
    id: int
    name: str
    color: Optional[str] = None

    class Config:
        orm_mode = True

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

# --- SongArtistLink (アーティスト紐付け) ---
class SongArtistLinkCreate(BaseModel):
    song_id: int
    artist_id: int
    role: str # 例: "Composer", "Vocalist", "Guitarist"

class SongArtistLink(BaseModel):
    id: int # v2.5からidを返す
    song_id: int
    artist_id: int
    role: str

    class Config:
        orm_mode = True
        
# --- SongTieupLink (タイアップ紐付け) ---
class SongTieupLinkCreate(BaseModel):
    song_id: int
    tieup_id: int
    context: Optional[str] = None
    sort_index: Optional[int] = None # 10, 20, 30...

class SongTieupLink(BaseModel):
    id: int
    song_id: int
    tieup_id: int
    context: Optional[str] = None
    sort_index: Optional[int] = None

    class Config:
        orm_mode = True

# --- Tieup (タイアップ先) ---
class TieupCreate(BaseModel):
    name: str # "呪術廻戦", "チェンソーマン"
    category: Optional[str] = None # "Anime", "Game", "CM"

class Tieup(BaseModel):
    id: int
    name: str
    category: Optional[str] = None

    class Config:
        orm_mode = True

# SongArtistLinkの情報を簡略化して返すためのスキーマ
class ArtistLinkInfo(BaseModel):
    artist_id: int
    role: str
    
    # Artistマスター情報の一部をネストして含める
    artist_name: str
    
    class Config:
        orm_mode = True

# SongTieupLinkの情報を簡略化して返すためのスキーマ
class TieupLinkInfo(BaseModel):
    tieup_id: int
    context: Optional[str]
    sort_index: Optional[int]
    
    # Tieupマスター情報の一部をネストして含める
    tieup_name: str
    tieup_category: Optional[str]

    class Config:
        orm_mode = True

# 既存のSongスキーマを拡張し、関連情報を含める
class SongDetail(BaseModel):
    id: int
    title: str
    release_date: Optional[date]
    spotify_song_id: Optional[str]
    
    artists: List[ArtistLinkInfo] = Field(..., alias="artist_links") # 'artist_links' リレーションシップを参照
    tieups: List[TieupLinkInfo] = Field(..., alias="tieup_links")   # 'tieup_links' リレーションシップを参照

    tags: List[Tag] = [] # 👈 この曲に紐づくタグのリスト

    class Config:
        orm_mode = True
        allow_population_by_field_name = True # エイリアスが機能するために必要

# --- Song Search Result (検索結果) ---
class SongSearchResult(BaseModel):
    id: int
    title: str
    release_date: Optional[date]
    role: str # このアーティストがその曲で果たした役割

    class Config:
        orm_mode = True

# --- PerformanceCreate (公演の基本情報) ---
class PerformanceCreate(BaseModel):
    artist_id: int
    tour_id: Optional[int] = None
    performance_type: str
    name: str
    date: date
    venue: Optional[str] = None
    
    open_time: Optional[time] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    stage_name: Optional[str] = None

# --- PerformanceRoster (公演参加者) ---
class PerformanceRosterCreate(BaseModel):
    performance_id: int
    artist_id: int
    role: str
    context: Optional[str] = None

class PerformanceRoster(BaseModel):
    id: int
    performance_id: int
    artist: ArtistMini
    role: str
    context: Optional[str] = None

    class Config:
        orm_mode = True

# --- SetlistEntry (セットリストのエントリ) ---
class SetlistEntryCreate(BaseModel):
    performance_id: int
    song_id: int
    order_index: int
    notes: Optional[str] = None # "Encore 1", "Medley" など

class SetlistEntry(BaseModel):
    id: int
    performance_id: int
    song_id: int
    order_index: int
    notes: Optional[str] = None

    class Config:
        orm_mode = True

class Tour(BaseModel):
    id: int
    name: str
    
    class Config:
        orm_mode = True

# --- Tour (ツアー) ---
class TourCreate(BaseModel):
    name: str # ツアーの名称 (例: "TOUR 2024『Catcher In The Spy』")


# 3. Performance 詳細（親）スキーマ
class Performance(BaseModel):
    id: int
    artist_id: int
    main_artist: ArtistMini = None
    tour: Optional[Tour] = None
    performance_type: str
    name: str
    date: date
    venue: Optional[str] = None

    open_time: Optional[time] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    stage_name: Optional[str] = None
    
    # ★ ネストされた関連データの追加 ★
    setlist_entries: List[SetlistEntry] = []  # SetlistEntry のリスト
    roster_entries: List[PerformanceRoster] = []  # PerformanceRoster のリスト
    
    class Config:
        orm_mode = True

# --- PerformanceSummary (一覧表示用) ---
class PerformanceSummary(BaseModel):
    id: int
    artist_id: int
    
    # 読み取りを高速化するため、ネストされたオブジェクトもサマリーに含める
    main_artist: ArtistMini
    tour: Optional[Tour] = None
    
    performance_type: str
    name: str
    date: date
    venue: Optional[str] = None

    open_time: Optional[time] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    stage_name: Optional[str] = None
    
    class Config:
        orm_mode = True

# --- Album (アルバム・マスター) ---
class AlbumCreate(BaseModel):
    main_title: str
    version_title: Optional[str] = None
    artist_id: Optional[int] = None # メインアーティスト (コンピの場合はNULL)
    physical_release_date: Optional[date] = None
    digital_release_date: Optional[date] = None
    spotify_album_id: Optional[str] = None

class Album(BaseModel):
    id: int
    main_title: str
    version_title: Optional[str] = None
    artist_id: Optional[int] = None
    physical_release_date: Optional[date] = None
    digital_release_date: Optional[date] = None
    spotify_album_id: Optional[str] = None

    class Config:
        orm_mode = True

# --- AlbumRelationship (アルバム関連) ---
class AlbumRelationshipCreate(BaseModel):
    album_id_1: int # 親 (例: 初回盤)
    album_id_2: int # 子 (例: 特典DVD)
    relationship_type: str # "Includes", "Version Of"

class AlbumRelationship(BaseModel):
    id: int
    album_id_1: int
    album_id_2: int
    relationship_type: str

    class Config:
        orm_mode = True

class AlbumTrackCreate(BaseModel):
    album_id: int
    song_id: int
    track_number: int
    disc_number: int = 1 # デフォルト値を1に設定

class AlbumTrack(BaseModel):
    id: int
    album_id: int
    song_id: int
    track_number: int
    disc_number: int
    class Config:
        orm_mode = True

# --- Merchandise (グッズ・マスター) ---
class MerchandiseCreate(BaseModel):
    name: str
    merch_type: Optional[str] = None # "Live Goods", "Album Bonus"

class Merchandise(BaseModel):
    id: int
    name: str
    merch_type: Optional[str] = None
    class Config:
        orm_mode = True

# --- Store (店舗マスター) ---
class StoreCreate(BaseModel):
    name: str # "タワーレコード", "HMV"

class Store(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

# --- MerchandiseRelationship (グッズ関連) ---
class MerchandiseRelationshipCreate(BaseModel):
    merchandise_id_1: int # 子 (例: Tシャツ(白))
    merchandise_id_2: int # 親 (例: Tシャツ)
    relationship_type: str # "Variation Of"

class MerchandiseRelationship(BaseModel):
    id: int
    merchandise_id_1: int
    merchandise_id_2: int
    relationship_type: str

    class Config:
        orm_mode = True

# --- User (ユーザー) ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr # pydanticによるメール形式のバリデーション
    password: str # APIが受け取る平文のパスワード

class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        orm_mode = True

# --- UserPossession (ユーザーの所有物) ---
class UserPossessionCreate(BaseModel):
    user_id: int
    entity_type: str # "album", "merchandise"
    entity_id: int
    status: Optional[str] = "Owned" # デフォルト "Owned"
    notes: Optional[str] = None

class UserPossession(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    status: Optional[str]
    notes: Optional[str]

    class Config:
        orm_mode = True

class UserAttendanceCreate(BaseModel):
    user_id: int
    performance_id: int
    status: Optional[str] = "Attended" # デフォルト "Attended"
    notes: Optional[str] = None

class UserAttendance(BaseModel):
    id: int
    user_id: int
    performance_id: int
    status: Optional[str]
    notes: Optional[str]
    class Config:
        orm_mode = True

# --- Song Search (GET /songs/ の検索条件) ---
class SongSearch(BaseModel):
    title_search: Optional[str] = None
    sort_by: str = "id"
    role_filter: Optional[str] = None
    tieup_id_filter: Optional[int] = None
    artist_id_filter: Optional[int] = None