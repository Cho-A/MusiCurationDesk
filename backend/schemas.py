from __future__ import annotations

from datetime import date, datetime, time
from datetime import date as dt_date  # aliases for PerformanceUpdate field collision
from datetime import time as dt_time
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

# --- Artist (アーティスト) ---


# APIが「受け取る」データの型 (登録時)
class ArtistCreate(BaseModel):
    name: str
    name_kana: str | None = None
    spotify_artist_id: str | None = None
    notes: str | None = None


# APIが「返す」データの型 (登録後・参照時)
class Artist(BaseModel):
    id: int
    name: str
    name_kana: str | None = None
    spotify_artist_id: str | None = None
    notes: str | None = None

    class Config:
        from_attributes = True  # SQLAlchemyモデルをPydanticモデルに変換できるようにする


class AliasInfo(BaseModel):
    alias_name: str
    context: str | None

    class Config:
        from_attributes = True


class RoleCount(BaseModel):
    role: str
    count: int

    class Config:
        from_attributes = True


# --- Song Contribution (楽曲貢献情報) ---
class SongContribution(BaseModel):
    song_id: int
    title: str
    roles: list[str]
    cover_image_url: str | None = None
    is_video: bool = False

    class Config:
        from_attributes = True


# --- Artist Detail (最終応答スキーマ) ---
class ArtistDetail(BaseModel):
    id: int
    name: str
    name_kana: str | None = None
    spotify_artist_id: str | None
    image_url: str | None
    notes: str | None

    # ★ 関連情報をリストとして含める ★
    aliases: list[AliasInfo] = []
    role_counts: list[RoleCount] = []
    members: list["ArtistRelationshipInfo"] = []
    tags: list["TagInfo"] = []

    # 追加
    albums: list["AlbumMini"] = []

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedSongs(BaseModel):
    total: int
    items: list[SongContribution]


# --- ArtistMini (参照用) ---
class ArtistMini(BaseModel):
    id: int
    name: str
    image_url: str | None = None

    class Config:
        from_attributes = True


class ArtistRelationshipInfo(BaseModel):
    id: int
    name: str
    image_url: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    class Config:
        from_attributes = True


class TagInfo(BaseModel):
    id: int
    name: str
    color: str | None = None

    class Config:
        from_attributes = True


class ArtistMemberCreate(BaseModel):
    member_artist_id: int
    start_date: date | None = None
    end_date: date | None = None


class ArtistMemberUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None


class TagAssign(BaseModel):
    tag_id: int


# --- Tag (タグ・マスター) ---
class TagCreate(BaseModel):
    name: str  # タグ名 (例: "バラード", "ライブ定番曲")
    color: str | None = None  # UI用 (例: "#FF0000")
    parent_id: int | None = None  # オプトイン階層用


class Tag(BaseModel):
    id: int
    name: str
    color: str | None = None
    parent_id: int | None = None

    class Config:
        from_attributes = True


# --- Song (楽曲) ---


# 楽曲登録時にAPIが「受け取る」データの型
class SongCreate(BaseModel):
    title: str
    spotify_song_id: str | None = None
    isrc: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    lyrics: str | None = None
    track_category: str | None = None


# APIが「返す」データの型 (登録後・参照時)
class Song(BaseModel):
    id: int
    title: str
    spotify_song_id: str | None = None
    isrc: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    work_id: int | None = None
    is_video: bool = False
    version_name: str | None = None
    is_streaming_available: bool = True
    track_category: str | None = None
    primary_album_title: Optional[str] = None

    # 検索一覧などでアーティスト情報を表示できるように追加
    artists: list["ArtistLinkInfo"] = Field(
        default=[],
        alias="artist_links",
    )
    primary_album: AlbumMini | None = None

    class Config:
        from_attributes = True  # SQLAlchemyモデルをPydanticモデルに変換
        populate_by_name = True

    @model_validator(mode="before")
    @classmethod
    def set_primary_album_title(cls, data: Any):
        if hasattr(data, "primary_album") and data.primary_album:
            if not getattr(data, "primary_album_title", None):
                album_title = (
                    data.primary_album.album_group.title
                    if getattr(data.primary_album, "album_group", None)
                    else data.primary_album.main_title
                )
                if isinstance(data, dict):
                    data["primary_album_title"] = album_title
                else:
                    setattr(data, "primary_album_title", album_title)
        return data


# --- WorkArtistLink (作品とアーティストの紐付け) ---
class WorkArtistLinkCreate(BaseModel):
    work_id: int
    artist_id: int
    role_category: str
    role_detail: str | None = None


class WorkArtistLink(WorkArtistLinkCreate):
    id: int

    class Config:
        from_attributes = True


# --- SongArtistLink (アーティスト紐付け) ---
class SongMainArtistUpdate(BaseModel):
    artist_id: int


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
        from_attributes = True


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
        from_attributes = True


# --- Tieup (タイアップ先) ---
class TieupCreate(BaseModel):
    name: str  # "呪術廻戦", "チェンソーマン", "BLEACH 千年血戦篇"
    category: str | None = None  # "Anime", "Game", "Series"
    parent_id: int | None = None  # 階層化用 (親タイアップのID)


class Tieup(BaseModel):
    id: int
    name: str
    category: str | None = None
    parent_id: int | None = None

    class Config:
        from_attributes = True


class TieupHierarchyNode(BaseModel):
    id: int
    name: str
    category: str | None = None

    class Config:
        from_attributes = True


class TieupDetail(Tieup):
    children: list[Tieup] = []
    parents: list[TieupHierarchyNode] = []  # ルートからのパンくずリスト

    class Config:
        from_attributes = True


# SongArtistLinkの情報を簡略化して返すためのスキーマ
class ArtistLinkInfo(BaseModel):
    artist_id: int
    role_category: str
    role_detail: str | None = None

    # Artistマスター情報の一部をネストして含める
    artist_name: str

    class Config:
        from_attributes = True


class AlbumCardData(BaseModel):
    id: int
    main_title: str
    version_title: str | None = None
    cover_image_url: str | None = None
    release_date: str | None = None
    artist_names: list[str] | None = None
    album_group_id: int | None = None

    @model_validator(mode="before")
    @classmethod
    def extract_fields(cls, data: any) -> any:
        if isinstance(data, dict):
            return data

        raw_date = getattr(data, "physical_release_date", None) or getattr(data, "digital_release_date", None)
        str_date = raw_date.isoformat() if hasattr(raw_date, "isoformat") else str(raw_date) if raw_date else None

        # SQLAlchemy ORM fallback extraction
        return {
            "id": data.id,
            "main_title": data.main_title,
            "version_title": getattr(data, "version_title", None),
            "cover_image_url": data.cover_image_url
            or (data.album_group.cover_image_url if getattr(data, "album_group", None) else None),
            "release_date": str_date,
            "artist_names": [link.artist.name for link in data.artist_links]
            if getattr(data, "artist_links", None)
            else [],
            "album_group_id": getattr(data, "album_group_id", None),
        }

    class Config:
        from_attributes = True


class SongCardData(BaseModel):
    id: int
    title: str
    artist_name: str | None = None
    cover_image_url: str | None = None
    is_video: bool = False
    role: str | None = None
    album_title: str | None = None
    version_name: str | None = None
    is_streaming_available: bool = True
    track_category: str | None = None
    work_id: int | None = None
    release_date: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_fields(cls, data: any) -> any:
        print("DEBUG SongCardData data type:", type(data))
        if isinstance(data, dict):
            print("DEBUG dict keys:", data.keys())
            return data

        # SQLAlchemy ORM fallback extraction
        artist_name = "Unknown Artist"
        if getattr(data, "artist_links", None):
            artist_name = data.artist_links[0].artist.name
        elif getattr(data, "work", None) and getattr(data.work, "artist_links", None):
            artist_name = data.work.artist_links[0].artist.name

        cover_url = None
        album_title = None
        release_date = None
        # To avoid lazy load N+1, it's better if routers pass dicts or ensure eager loading
        if getattr(data, "album_links", None):
            first_track = data.album_links[0] if data.album_links else None
            if first_track and first_track.album:
                cover_url = first_track.album.cover_image_url or (
                    first_track.album.album_group.cover_image_url
                    if getattr(first_track.album, "album_group", None)
                    else None
                )
                album_title = first_track.album.main_title
                raw_date = None
                if getattr(first_track.album, "album_group", None):
                    raw_date = first_track.album.album_group.release_date
                else:
                    raw_date = first_track.album.physical_release_date
                if raw_date is not None:
                    release_date = raw_date.isoformat() if hasattr(raw_date, "isoformat") else str(raw_date)

        return {
            "id": data.id,
            "title": data.title,
            "artist_name": artist_name,
            "cover_image_url": cover_url,
            "is_video": getattr(data, "is_video", False),
            "role": None,  # Should be explicitly passed if needed
            "album_title": album_title,
            "version_name": getattr(data, "version_name", None),
            "is_streaming_available": getattr(data, "is_streaming_available", True),
            "work_id": getattr(data, "work_id", None),
            "release_date": release_date,
        }

    class Config:
        from_attributes = True


class WorkArtistLinkInfo(BaseModel):
    artist_id: int
    role_category: str
    role_detail: str | None = None
    artist_name: str

    class Config:
        from_attributes = True


# SongTieupLinkの情報を簡略化して返すためのスキーマ
class TieupLinkInfo(BaseModel):
    tieup_id: int
    context: str | None
    sort_index: int | None

    # Tieupマスター情報の一部をネストして含める
    tieup_name: str
    tieup_category: str | None

    class Config:
        from_attributes = True


class AlbumMini(BaseModel):
    id: int
    main_title: str
    version_title: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None
    album_group_id: int | None = None
    release_date: str | None = None

    @model_validator(mode="before")
    @classmethod
    def set_computed_fields(cls, data: any) -> any:
        if isinstance(data, dict):
            if not data.get("cover_image_url") and data.get("album_group"):
                data["cover_image_url"] = data["album_group"].get("cover_image_url")

            if not data.get("release_date"):
                if data.get("album_group") and data["album_group"].get("release_date"):
                    data["release_date"] = str(data["album_group"].get("release_date"))
                else:
                    raw_date = data.get("physical_release_date") or data.get("digital_release_date")
                    if raw_date:
                        data["release_date"] = str(raw_date)
        elif hasattr(data, "__dict__"):
            if not getattr(data, "cover_image_url", None) and getattr(data, "album_group", None):
                data.cover_image_url = data.album_group.cover_image_url

            if not getattr(data, "release_date", None):
                if getattr(data, "album_group", None) and getattr(data.album_group, "release_date", None):
                    data.release_date = str(data.album_group.release_date)
                else:
                    raw_date = getattr(data, "physical_release_date", None) or getattr(
                        data, "digital_release_date", None
                    )
                    if raw_date:
                        data.release_date = str(raw_date)
        return data

    class Config:
        from_attributes = True


class AlbumTrackInfo(BaseModel):
    album_id: int
    track_number: int
    disc_number: int
    duration_ms: int | None = None
    album: AlbumMini
    song_title: str | None = None
    version_name: str | None = None
    song_id: int | None = None
    is_video: bool | None = None
    display_title: str | None = None

    class Config:
        from_attributes = True


# --- MusicalWork (作品マスター) ---
class MusicalWorkBase(BaseModel):
    title: str
    jasrac_code: str | None = None
    iswc_code: str | None = None


class MusicalWork(MusicalWorkBase):
    id: int
    artists: list[WorkArtistLinkInfo] = Field(
        default=[],
        alias="artist_links",
    )

    class Config:
        from_attributes = True
        populate_by_name = True


# 既存のSongスキーマを拡張し、関連情報を含める
class SongDetail(BaseModel):
    id: int
    title: str
    spotify_song_id: str | None = None
    isrc: str | None = None
    spotify_song_title: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None
    lyrics: str | None = None
    work_id: int | None = None
    is_video: bool = False
    version_name: str | None = None
    is_streaming_available: bool = True
    track_category: str | None = None
    work: MusicalWork | None = None
    primary_album_title: Optional[str] = None
    release_date: Optional[str] = None

    other_versions: list["SongDetailMini"] = []

    artists: list[ArtistLinkInfo] = Field(
        ...,
        alias="artist_links",
    )  # 'artist_links' リレーションシップを参照
    tieups: list[TieupLinkInfo] = Field(
        ...,
        alias="tieup_links",
    )  # 'tieup_links' リレーションシップを参照

    albums: list[AlbumTrackInfo] = Field(
        default=[],
        alias="album_links",
    )

    tags: list[Tag] = []  # 👈 この曲に紐づくタグのリスト
    aliases: list["SongAlias"] = []

    class Config:
        from_attributes = True
        populate_by_name = True  # エイリアスが機能するために必要

    @model_validator(mode="before")
    @classmethod
    def set_primary_album_title(cls, data: Any):
        if hasattr(data, "primary_album") and data.primary_album:
            if not getattr(data, "primary_album_title", None):
                album_title = (
                    data.primary_album.album_group.title
                    if getattr(data.primary_album, "album_group", None)
                    else data.primary_album.main_title
                )
                if isinstance(data, dict):
                    data["primary_album_title"] = album_title
                else:
                    setattr(data, "primary_album_title", album_title)
            if not getattr(data, "release_date", None):
                raw_date = getattr(data.primary_album, "physical_release_date", None) or getattr(
                    data.primary_album, "digital_release_date", None
                )
                if raw_date:
                    if isinstance(data, dict):
                        data["release_date"] = str(raw_date)
                    else:
                        setattr(data, "release_date", str(raw_date))
        return data


# --- Song Search Result (検索結果) ---
class SongSearchResult(BaseModel):
    id: int
    title: str
    role_category: str  # このアーティストがその曲で果たした役割の大分類
    role_detail: str | None = None

    class Config:
        from_attributes = True


# --- Venue (会場) ---


class SongMini(BaseModel):
    id: int
    title: str
    is_video: bool = False
    version_name: str | None = None
    is_streaming_available: bool = True
    spotify_song_id: str | None = None
    isrc: Optional[str] = None
    track_category: Optional[str] = None
    primary_album_title: Optional[str] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def set_primary_album_title(cls, data: Any):
        if hasattr(data, "primary_album") and data.primary_album:
            if not getattr(data, "primary_album_title", None):
                album_title = (
                    data.primary_album.album_group.title
                    if getattr(data.primary_album, "album_group", None)
                    else data.primary_album.main_title
                )
                if isinstance(data, dict):
                    data["primary_album_title"] = album_title
                else:
                    setattr(data, "primary_album_title", album_title)
        return data


class SongAliasCreate(BaseModel):
    alias_name: str


class SongAlias(BaseModel):
    id: int
    song_id: int
    alias_name: str

    class Config:
        from_attributes = True


class SongUpdate(BaseModel):
    title: str | None = None
    work_id: int | None = None
    is_video: bool | None = None
    version_name: str | None = None
    is_streaming_available: bool = None
    track_category: str | None = None
    lyrics: str | None = None
    jasrac_code: str | None = None
    jasrac_title: str | None = None


# --- Credits (Bulk Edit) ---


class CreditBulkEditItem(BaseModel):
    song_id: int
    title: str
    lyricists: list[str]
    composers: list[str]
    arrangers: list[str]


class CreditBulkUpdateItem(BaseModel):
    song_id: int
    lyricists: list[str]
    composers: list[str]
    arrangers: list[str]


class CreditBulkUpdateRequest(BaseModel):
    updates: list[CreditBulkUpdateItem]


class CustomRoleApply(BaseModel):
    role_category: str
    artists: list[str]
    overwrite: bool = True


class ArtistCreditApplyRequest(BaseModel):
    """特定アーティストの全楽曲に一括でクレジットを適用する"""

    artist_id: int
    target_song_ids: list[int] | None = None  # 指定がある場合はこれらの楽曲のみを対象とする
    lyricists: list[str] = []
    composers: list[str] = []
    arrangers: list[str] = []
    custom_roles: list[CustomRoleApply] = []
    # True のフィールドだけ上書きする (False なら既存を保持)
    overwrite_lyricists: bool = True
    overwrite_composers: bool = True
    overwrite_arrangers: bool = True


class AlbumCreate(BaseModel):
    album_group_id: int | None = None
    main_title: str
    version_title: str | None = None
    artist_id: int | None = None  # メインアーティスト (コンピの場合はNULL)
    physical_release_date: date | None = None
    digital_release_date: date | None = None
    spotify_album_id: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None
    media_format: str | None = "CD"


class AlbumUpdate(BaseModel):
    album_group_id: int | None = None
    main_title: str | None = None
    version_title: str | None = None
    artist_id: int | None = None
    physical_release_date: date | None = None
    digital_release_date: date | None = None
    spotify_album_id: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None
    media_format: str | None = None


class BulkStreamingAvailabilityUpdate(BaseModel):
    disc_number: int | None = None
    is_streaming_available: bool


class AlbumDuplicateRequest(BaseModel):
    version_title: str | None = None
    media_format: str | None = None


class Album(BaseModel):
    id: int
    album_group_id: int | None = None
    main_title: str
    version_title: str | None = None
    artist_id: int | None = None
    physical_release_date: date | None = None
    digital_release_date: date | None = None
    spotify_album_id: str | None = None
    cover_image_url: str | None = None
    album_type: str | None = None
    media_format: str | None = "CD"

    class Config:
        from_attributes = True


class BulkDiscMergeRequest(BaseModel):
    target_album_id: int
    target_disc_number: int | None = None


class BulkEditionMergeRequest(BaseModel):
    target_album_id: int
    source_album_ids: list[int]


class AlbumDiscUpdate(BaseModel):
    title: str | None = None
    media_format: str | None = None
    edition: str | None = None


class AlbumDiscReorderRequest(BaseModel):
    original_disc_numbers: list[int]


class AlbumDiscCreate(BaseModel):
    disc_number: int
    title: str | None = None
    media_format: str | None = None
    edition: str | None = None


class AlbumDiscBase(BaseModel):
    id: int
    disc_number: int
    title: str | None = None
    media_format: str | None = None
    edition: str | None = None

    class Config:
        from_attributes = True


class AlbumTrackForAlbum(BaseModel):
    id: int
    song_id: int
    track_number: int
    disc_number: int
    duration_ms: int | None = None
    display_title: str | None = None
    notes: str | None = None
    media_format: str | None = None
    spotify_track_id: str | None = None
    song: "Song"  # Songスキーマを参照

    class Config:
        from_attributes = True


class AlbumDetail(Album):
    artist: ArtistMini | None = None
    discs: list[AlbumDiscBase] = []
    album_tracks: list[AlbumTrackForAlbum] = []


class AlbumGroupBase(BaseModel):
    title: str
    artist_id: int | None = None
    release_date: date | None = None
    album_type: str | None = None
    cover_image_url: str | None = None


class AlbumGroupCreate(AlbumGroupBase):
    pass


class AlbumGroupUpdate(BaseModel):
    title: str | None = None
    artist_id: int | None = None
    release_date: date | None = None
    album_type: str | None = None
    cover_image_url: str | None = None


class AlbumGroup(AlbumGroupBase):
    id: int

    class Config:
        from_attributes = True


class AlbumGroupWithArtist(AlbumGroup):
    artist: ArtistMini | None = None

    class Config:
        from_attributes = True


class AlbumGroupDetail(AlbumGroup):
    artist: ArtistMini | None = None
    albums: list[AlbumDetail] = []

    class Config:
        from_attributes = True


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
        from_attributes = True


class AlbumTrackBase(BaseModel):
    album_id: int
    song_id: int
    track_number: int
    disc_number: int | None = 1
    duration_ms: int | None = None
    display_title: str | None = None
    notes: str | None = None
    spotify_track_id: str | None = None


class AlbumTrackCreate(AlbumTrackBase):
    pass


class AlbumTrackUpdate(BaseModel):
    track_number: int | None = None
    disc_number: int | None = None
    song_id: int | None = None
    duration_ms: int | None = None
    media_format: str | None = None
    display_title: str | None = None
    notes: str | None = None


class AlbumTrack(AlbumTrackBase):
    id: int

    class Config:
        from_attributes = True


# --- Merchandise (グッズ・マスター) ---


class UserCreate(BaseModel):
    username: str
    email: EmailStr  # pydanticによるメール形式のバリデーション
    password: str  # APIが受け取る平文のパスワード


class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


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
        from_attributes = True


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
        from_attributes = True


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
    spotify_song_id: str | None = None
    isrc: str | None = None
    is_video: bool = False
    version_name: str | None = None
    is_streaming_available: bool = True
    track_category: str | None = None
    primary_album_title: Optional[str] = None
    release_date: Optional[str] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def set_primary_album_title(cls, data: Any):
        if hasattr(data, "primary_album") and data.primary_album:
            if not getattr(data, "primary_album_title", None):
                album_title = (
                    data.primary_album.album_group.title
                    if getattr(data.primary_album, "album_group", None)
                    else data.primary_album.main_title
                )
                if isinstance(data, dict):
                    data["primary_album_title"] = album_title
                else:
                    setattr(data, "primary_album_title", album_title)
            if not getattr(data, "release_date", None):
                raw_date = getattr(data.primary_album, "physical_release_date", None) or getattr(
                    data.primary_album, "digital_release_date", None
                )
                if raw_date:
                    if isinstance(data, dict):
                        data["release_date"] = str(raw_date)
                    else:
                        setattr(data, "release_date", str(raw_date))
        return data


# --- CD Import (手動アルバムビルダー用) ---
class CDImportDisc(BaseModel):
    disc_number: int
    title: str | None = None
    media_format: str | None = None
    edition: str | None = None


class CDImportTrack(BaseModel):
    disc_number: int
    track_number: int
    title: str
    display_title: str | None = None
    media_format: str | None = None
    notes: str | None = None
    song_id: int | None = None  # Noneの場合は新規楽曲として登録


class CDImportRequest(BaseModel):
    target_album_id: int | None = None  # Noneの場合は新規アルバムとして作成
    title: str
    release_date: date | None = None
    album_type: str | None = "physical"
    append_mode: bool = False
    discs: list[CDImportDisc] = []
    tracks: list[CDImportTrack]
    artist_id: int | None = None
    apply_artist_to_tracks: bool = True


# 循環参照解決のため
AlbumTrackForAlbum.model_rebuild()
SongDetail.model_rebuild()
Song.model_rebuild()
