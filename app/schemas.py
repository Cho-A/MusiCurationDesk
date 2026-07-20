from __future__ import annotations
from typing import List, Optional, Any
from datetime import date, datetime, time

from pydantic import BaseModel, EmailStr, Field

# --- Artist (アーティスト) ---


# APIが「受け取る」データの型 (登録時)
class ArtistCreate(BaseModel):
    name: str
    spotify_artist_id: str | None = None
    notes: str | None = None


# APIが「返す」データの型 (登録後・参照時)
class Artist(BaseModel):
    id: int
    name: str
    spotify_artist_id: str | None = None
    notes: str | None = None

    class Config:
        orm_mode = True  # SQLAlchemyモデルをPydanticモデルに変換できるようにする


class AliasInfo(BaseModel):
    alias_name: str
    context: str | None

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
    spotify_artist_id: str | None
    notes: str | None

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
    name: str  # タグ名 (例: "バラード", "ライブ定番曲")
    color: str | None = None  # UI用 (例: "#FF0000")
    parent_id: int | None = None # オプトイン階層用

class Tag(BaseModel):
    id: int
    name: str
    color: str | None = None
    parent_id: int | None = None

    class Config:
        orm_mode = True


# --- Song (楽曲) ---


# 楽曲登録時にAPIが「受け取る」データの型
class SongCreate(BaseModel):
    title: str
    spotify_song_id: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    lyrics: str | None = None


# APIが「返す」データの型 (登録後・参照時)
class Song(BaseModel):
    id: int
    title: str
    spotify_song_id: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    # lyrics は重いので返さない (任意)

    class Config:
        orm_mode = True  # SQLAlchemyモデルをPydanticモデルに変換


# --- SongArtistLink (アーティスト紐付け) ---
class SongArtistLinkCreate(BaseModel):
    song_id: int
    artist_id: int
    role_category: str  # 例: "Composer", "Vocalist", "Guitarist"
    role_detail: str | None = None


class SongArtistLink(BaseModel):
    id: int  # v2.5からidを返す
    song_id: int
    artist_id: int
    role_category: str
    role_detail: str | None = None

    class Config:
        orm_mode = True


# --- SongTieupLink (タイアップ紐付け) ---
class SongTieupLinkCreate(BaseModel):
    song_id: int
    tieup_id: int
    context: str | None = None
    sort_index: int | None = None  # 10, 20, 30...


class SongTieupLink(BaseModel):
    id: int
    song_id: int
    tieup_id: int
    context: str | None = None
    sort_index: int | None = None

    class Config:
        orm_mode = True


# --- Tieup (タイアップ先) ---
class TieupCreate(BaseModel):
    name: str  # "呪術廻戦", "チェンソーマン", "BLEACH 千年血戦篇"
    category: str | None = None  # "Anime", "Game", "Series"
    parent_id: int | None = None # 階層化用 (親タイアップのID)


class Tieup(BaseModel):
    id: int
    name: str
    category: str | None = None
    parent_id: int | None = None

    class Config:
        orm_mode = True


class TieupHierarchyNode(BaseModel):
    id: int
    name: str
    category: str | None = None

    class Config:
        orm_mode = True


class TieupDetail(Tieup):
    children: List[Tieup] = []
    parents: List[TieupHierarchyNode] = []  # ルートからのパンくずリスト

    class Config:
        orm_mode = True


# SongArtistLinkの情報を簡略化して返すためのスキーマ
class ArtistLinkInfo(BaseModel):
    artist_id: int
    role_category: str
    role_detail: str | None = None

    # Artistマスター情報の一部をネストして含める
    artist_name: str

    class Config:
        orm_mode = True


# SongTieupLinkの情報を簡略化して返すためのスキーマ
class TieupLinkInfo(BaseModel):
    tieup_id: int
    context: str | None
    sort_index: int | None

    # Tieupマスター情報の一部をネストして含める
    tieup_name: str
    tieup_category: str | None

    class Config:
        orm_mode = True

class AlbumMini(BaseModel):
    id: int
    main_title: str
    version_title: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None

    class Config:
        orm_mode = True

class AlbumTrackInfo(BaseModel):
    album_id: int
    track_number: int
    disc_number: int
    duration_ms: int | None = None
    album: AlbumMini
    class Config:
        orm_mode = True


# --- MusicalWork (作品マスター) ---
class MusicalWorkBase(BaseModel):
    title: str
    jasrac_code: str | None = None
    iswc_code: str | None = None

class MusicalWork(MusicalWorkBase):
    id: int

    class Config:
        orm_mode = True


# 既存のSongスキーマを拡張し、関連情報を含める
class SongDetail(BaseModel):
    id: int
    title: str
    spotify_song_id: str | None = None
    spotify_song_title: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    lyrics: str | None = None
    work_id: int | None = None
    work: MusicalWork | None = None
    
    other_versions: List["SongDetailMini"] = []

    artists: List[ArtistLinkInfo] = Field(
        ...,
        alias="artist_links",
    )  # 'artist_links' リレーションシップを参照
    tieups: List[TieupLinkInfo] = Field(
        ...,
        alias="tieup_links",
    )  # 'tieup_links' リレーションシップを参照

    albums: List[AlbumTrackInfo] = Field(
        default=[],
        alias="album_links",
    )

    tags: List[Tag] = []  # 👈 この曲に紐づくタグのリスト

    class Config:
        orm_mode = True
        allow_population_by_field_name = True  # エイリアスが機能するために必要


# --- Song Search Result (検索結果) ---
class SongSearchResult(BaseModel):
    id: int
    title: str
    release_date: date | None
    role_category: str  # このアーティストがその曲で果たした役割の大分類
    role_detail: str | None = None

    class Config:
        orm_mode = True


# --- Venue (会場) ---
class VenueCreate(BaseModel):
    name: str
    prefecture: str | None = None
    capacity: int | None = None
    notes: str | None = None

class Venue(BaseModel):
    id: int
    name: str
    prefecture: str | None = None
    capacity: int | None = None
    notes: str | None = None

    class Config:
        orm_mode = True


# --- PerformanceCreate (公演の基本情報) ---
class PerformanceCreate(BaseModel):
    artist_id: int | None = None
    tour_id: int | None = None
    performance_type: str
    event_type: str | None = "Live"
    name: str
    date: date
    venue_id: int | None = None
    open_time: time | None = None
    start_time: time | None = None
    end_time: time | None = None
    stage_name: str | None = None


# --- PerformanceRoster (公演参加者) ---
class PerformanceRosterCreate(BaseModel):
    performance_id: int
    artist_id: int
    role: str
    context: str | None = None


class PerformanceRoster(BaseModel):
    id: int
    performance_id: int
    artist: ArtistMini
    role: str
    context: str | None = None

    class Config:
        orm_mode = True

class SongMini(BaseModel):
    id: int
    title: str

    class Config:
        orm_mode = True


# --- SetlistEntry (セットリストのエントリ) ---
class SetlistEntryCreate(BaseModel):
    performance_id: int
    song_id: int | None = None
    entry_type: str = "SONG"
    unresolved_song_name: str | None = None
    order_index: int
    notes: str | None = None  # "Encore 1", "Medley" など


class SetlistEntry(BaseModel):
    id: int
    performance_id: int
    song_id: int | None = None
    entry_type: str
    unresolved_song_name: str | None = None
    order_index: int
    notes: str | None = None
    song: SongMini | None = None

    class Config:
        orm_mode = True


class Tour(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


# --- Tour (ツアー) ---
class TourCreate(BaseModel):
    name: str  # ツアーの名称 (例: "TOUR 2024『Catcher In The Spy』")


# 3. Performance 詳細（親）スキーマ
class Performance(BaseModel):
    id: int
    artist_id: int | None = None
    main_artist: ArtistMini | None = None
    tour: Tour | None = None
    performance_type: str
    event_type: str
    name: str
    date: date
    venue: Venue | None = None
    open_time: time | None = None
    start_time: time | None = None
    end_time: time | None = None
    stage_name: str | None = None

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
    tour: Tour | None = None

    performance_type: str
    name: str
    date: date
    venue: str | None = None

    open_time: time | None = None
    start_time: time | None = None
    end_time: time | None = None
    stage_name: str | None = None

    class Config:
        orm_mode = True

# --- PerformanceDetail (詳細表示用) ---
class PerformanceDetail(Performance):
    setlist_entries: List[SetlistEntry] = []
    roster_entries: List[PerformanceRoster] = []
    
    class Config:
        orm_mode = True


# --- TourDetail (ツアー詳細・公演一覧用) ---
class TourDetail(Tour):
    performances: List[Performance] = []

    class Config:
        orm_mode = True


# --- Album (アルバム・マスター) ---
class AlbumCreate(BaseModel):
    main_title: str
    version_title: str | None = None
    artist_id: int | None = None  # メインアーティスト (コンピの場合はNULL)
    physical_release_date: date | None = None
    digital_release_date: date | None = None
    spotify_album_id: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None


class Album(BaseModel):
    id: int
    main_title: str
    version_title: str | None = None
    artist_id: int | None = None
    physical_release_date: date | None = None
    digital_release_date: date | None = None
    spotify_album_id: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None

    class Config:
        orm_mode = True

class AlbumTrackForAlbum(BaseModel):
    id: int
    song_id: int
    track_number: int
    disc_number: int
    duration_ms: int | None = None
    song: "Song"  # Songスキーマを参照

    class Config:
        orm_mode = True

class AlbumDetail(Album):
    album_tracks: List[AlbumTrackForAlbum] = []

    class Config:
        orm_mode = True


# --- AlbumRelationship (アルバム関連) ---
class AlbumRelationshipCreate(BaseModel):
    album_id_1: int  # 親 (例: 初回盤)
    album_id_2: int  # 子 (例: 特典DVD)
    relationship_type: str  # "Includes", "Version Of"


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
    disc_number: int | None = 1
    duration_ms: int | None = None


class AlbumTrack(BaseModel):
    id: int
    album_id: int
    song_id: int
    track_number: int
    disc_number: int
    duration_ms: int | None = None

    class Config:
        orm_mode = True


# --- Merchandise (グッズ・マスター) ---
class MerchandiseCreate(BaseModel):
    name: str
    merch_type: str | None = None  # "Live Goods", "Album Bonus"


class Merchandise(BaseModel):
    id: int
    name: str
    merch_type: str | None = None

    class Config:
        orm_mode = True


# --- Store (店舗マスター) ---
class StoreCreate(BaseModel):
    name: str  # "タワーレコード", "HMV"


class Store(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


# --- MerchandiseRelationship (グッズ関連) ---
class MerchandiseRelationshipCreate(BaseModel):
    merchandise_id_1: int  # 子 (例: Tシャツ(白))
    merchandise_id_2: int  # 親 (例: Tシャツ)
    relationship_type: str  # "Variation Of"


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
    email: EmailStr  # pydanticによるメール形式のバリデーション
    password: str  # APIが受け取る平文のパスワード


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
    entity_type: str  # "album", "merchandise"
    entity_id: int
    status: str | None = "Owned"  # デフォルト "Owned"
    notes: str | None = None


class UserPossession(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    status: str | None
    notes: str | None

    class Config:
        orm_mode = True


class UserAttendanceCreate(BaseModel):
    user_id: int
    performance_id: int
    status: str | None = "Attended"  # デフォルト "Attended"
    notes: str | None = None


class UserAttendance(BaseModel):
    id: int
    user_id: int
    performance_id: int
    status: str | None
    notes: str | None

    class Config:
        orm_mode = True


# --- UserPossession (入力用: user_id なし) ---
class UserPossessionInput(BaseModel):
    entity_type: str  # "album", "merchandise"
    entity_id: int
    status: str | None = "Owned"
    notes: str | None = None


# --- UserAttendance (入力用: user_id なし) ---
class UserAttendanceInput(BaseModel):
    performance_id: int
    status: str | None = "Attended"
    notes: str | None = None


# --- Song Search (GET /songs/ の検索条件) ---
class SongSearch(BaseModel):
    title_search: str | None = None
    sort_by: str = "id"
    role_filter: str | None = None
    tieup_id_filter: int | None = None
    artist_id_filter: int | None = None


# --- Token (トークンレスポンス) ---
class Token(BaseModel):
    access_token: str
    refresh_token: str  # ★ 追加
    token_type: str


# --- TokenData (トークンの中身) ---
class TokenData(BaseModel):
    username: str | None = None


class SongDetailMini(BaseModel):
    id: int
    title: str
    spotify_song_title: str | None = None

    class Config:
        orm_mode = True

# 循環参照解決のため
TourDetail.update_forward_refs()
AlbumTrackForAlbum.update_forward_refs(Song=Song)
SongDetail.update_forward_refs(SongDetailMini=SongDetailMini)
