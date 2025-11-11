import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, Table, UniqueConstraint, Index, Time, text
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

# --- 1. データベース接続設定 (まずはSQLite) ---
# (本番ではPostgreSQLのURLに変更します)
SQLALCHEMY_DATABASE_URL = "sqlite:///./music_curation_desk.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

#楽曲タグ紐付け (多対多)
song_tags = Table('song_tags', Base.metadata,
    Column('song_id', Integer, ForeignKey('songs.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

# アーティストタグ紐付け (多対多)
artist_tags = Table('artist_tags', Base.metadata,
    Column('artist_id', Integer, ForeignKey('artists.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

# ★★★ TourMerchandise (中間テーブル) ★★★
tour_merchandise = Table('tour_merchandise', Base.metadata,
    Column('tour_id', Integer, ForeignKey('tours.id'), primary_key=True),
    Column('merchandise_id', Integer, ForeignKey('merchandise.id'), primary_key=True)
)


# --- 2. テーブル定義 (スキーマv2.5) ---

class SongArtistLink(Base):
    __tablename__ = 'song_artists_link'
    
    # CSV(v2.5)に合わせて、id (PK) を追加
    id = Column(Integer, primary_key=True, index=True)
    
    song_id = Column(Integer, ForeignKey('songs.id'))
    artist_id = Column(Integer, ForeignKey('artists.id'))
    role = Column(String(100), nullable=False) # 例: "Composer"
    
    # 外部キーにインデックスを貼る (検索高速化)
    __table_args__ = (
        Index('idx_song_artist_role', 'song_id', 'artist_id', 'role'),
        # 「曲」「アーティスト」「役割」の組み合わせの重複を禁止
        UniqueConstraint('song_id', 'artist_id', 'role', name='_song_artist_role_uc'),
    )

    # ★ Artistの名前を取得するプロパティを追加
    @property
    def artist_name(self):
        return self.artist.name if self.artist else None

    artist = relationship("Artist", back_populates="song_links")
    song = relationship("Song", back_populates="artist_links")

class SongTieupLink(Base):
    __tablename__ = 'song_tieups_link'
    
    # CSV(v2.5)に合わせて、id (PK) を追加
    id = Column(Integer, primary_key=True, index=True)

    song_id = Column(Integer, ForeignKey('songs.id'))
    tieup_id = Column(Integer, ForeignKey('tieups.id'))
    context = Column(String(255), nullable=True) # 例: "1期 OP"
    sort_index = Column(Integer) # 例: 10, 20

    # 外部キーにインデックスを貼る
    __table_args__ = (
        Index('idx_tieup_sort', 'tieup_id', 'sort_index'),
        # 「タイアップ先」と「並び順」の組み合わせの重複を禁止
        UniqueConstraint('tieup_id', 'sort_index', name='_tieup_sort_index_uc'),
    )

    # ★ Tieupの名前とカテゴリを取得するプロパティを追加
    @property
    def tieup_name(self):
        return self.tieup.name if self.tieup else None
    
    @property
    def tieup_category(self):
        return self.tieup.category if self.tieup else None

    song = relationship("Song", back_populates="tieup_links")
    tieup = relationship("Tieup", back_populates="song_links")

class Artist(Base):
    __tablename__ = 'artists'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    spotify_artist_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now)

    # 1. ArtistAlias: 1対多 (別名義)
    aliases = relationship("ArtistAlias", back_populates="artist", cascade="all, delete-orphan")
    
    # 2. ArtistRelationship (複雑な関係): 自身が親(1)にも子(2)にもなりうる
    # primaryjoin を使ってリレーションの接続点を明確化
    relationships_as_a = relationship(
        "ArtistRelationship",
        primaryjoin="Artist.id == ArtistRelationship.artist_id_1",
        back_populates="artist_a",
        cascade="all, delete-orphan"
    )
    relationships_as_b = relationship(
        "ArtistRelationship",
        primaryjoin="Artist.id == ArtistRelationship.artist_id_2",
        back_populates="artist_b",
        cascade="all, delete-orphan"
    )

    # 3. SongArtistLink: 多対多 (曲の貢献度)
    song_links = relationship("SongArtistLink", back_populates="artist", cascade="all, delete-orphan")
    
    # 4. Performance: 1対多 (メインアクトとしての公演)
    performances = relationship("Performance", back_populates="main_artist", cascade="all, delete-orphan")
    
    # 5. PerformanceRoster: 多対多 (ゲスト/サポート参加)
    roster_participations = relationship("PerformanceRoster", back_populates="artist", cascade="all, delete-orphan")
    
    # アーティストタグへのリレーション (中間テーブル song_tags を使用)
    tags = relationship(
        "Tag",
        secondary=artist_tags, # 👈 artist_tags 中間テーブルを指定
        back_populates="artists"
    )

    @property
    def songs_contributed(self):
        """
        このアーティストが関わった全楽曲貢献情報を、楽曲単位でグルーピングして返します。
        """
        
        # 貢献データを {song_id: {title: ..., roles: [...]}, ...} の形式で集計
        contributions_map = {}
        
        for link in self.song_links:
            song_id = link.song_id
            
            if song_id not in contributions_map:
                contributions_map[song_id] = {
                    "song_id": song_id,
                    "title": link.song.title,
                    "roles": [] # 新しい役割リスト
                }
            
            # 役割をリストに追加
            contributions_map[song_id]["roles"].append(link.role)

        # マップの 'values' (値) をリストとして返します。これが Pydantic スキーマに適合します。
        return list(contributions_map.values())

class ArtistAlias(Base):
    __tablename__ = 'artist_aliases'
    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(Integer, ForeignKey('artists.id'))
    alias_name = Column(String(255), nullable=False, index=True)
    context = Column(String(255), nullable=True)
    artist = relationship("Artist", back_populates="aliases")

class ArtistRelationship(Base):
    __tablename__ = 'artist_relationships'
    id = Column(Integer, primary_key=True, index=True)
    artist_id_1 = Column(Integer, ForeignKey('artists.id'))
    artist_id_2 = Column(Integer, ForeignKey('artists.id'))
    relationship_type = Column(String(100))
    
    # 必須: 相手のArtistモデルへのリンク
    artist_a = relationship("Artist", foreign_keys=[artist_id_1], back_populates="relationships_as_a")
    artist_b = relationship("Artist", foreign_keys=[artist_id_2], back_populates="relationships_as_b")

class Song(Base):
    __tablename__ = 'songs'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    release_date = Column(Date, nullable=True)
    spotify_song_id = Column(String(100), nullable=True, unique=True)
    spotify_song_title = Column(String(255), nullable=True)
    jasrac_code = Column(String(20), nullable=True, index=True, unique=True)
    jasrac_title = Column(String(255), nullable=True)
    lyrics = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now)

    artist_links = relationship("SongArtistLink", back_populates="song")
    tieup_links = relationship("SongTieupLink", back_populates="song")
    setlist_entries = relationship("SetlistEntry", back_populates="song")
    album_links = relationship("AlbumTrack", back_populates="song")

    # 楽曲タグへのリレーション (中間テーブル song_tags を使用)
    tags = relationship(
        "Tag",
        secondary=song_tags, # 👈 song_tags 中間テーブルを指定
        back_populates="songs"
    )

    __table_args__ = (
        # title + release_date を、「spotify_song_id と jasrac_code が両方 NULL の行」に限ってユニーク
        Index(
            "uq_song_title_date_when_both_ids_null",
            "title", "release_date",
            unique=True,
            sqlite_where=text("(spotify_song_id IS NULL) AND (jasrac_code IS NULL)"),
            # PostgreSQL も使うなら↓も併記可
            # postgresql_where=text("(spotify_song_id IS NULL) AND (jasrac_code IS NULL)"),
        ),
    )

class Tieup(Base):
    __tablename__ = 'tieups'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100)) # "Anime", "Game"
    song_links = relationship("SongTieupLink", back_populates="tieup")

class Tour(Base):
    __tablename__ = 'tours'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    performances = relationship("Performance", back_populates="tour")

    merchandise = relationship(
        "Merchandise",
        secondary=tour_merchandise,
        back_populates="tours"
    )

class PerformanceRoster(Base):
    """
    公演参加者名簿
    (サポートメンバー、ゲスト、対バン相手などを管理)
    """
    __tablename__ = 'performance_roster'
    
    id = Column(Integer, primary_key=True, index=True)
    performance_id = Column(Integer, ForeignKey('performances.id'))
    artist_id = Column(Integer, ForeignKey('artists.id'))
    role = Column(String(100), nullable=False) # 例: "Guest Vocal", "Opposing Act"
    context = Column(String(255), nullable=True) # 例: "〇〇曲のみ参加"

    # UNIQUE(performance_id, artist_id)
    __table_args__ = (
        UniqueConstraint('performance_id', 'artist_id', name='_performance_artist_uc'),
    )

    performance = relationship("Performance", back_populates="roster_entries")
    artist = relationship("Artist") # PerformanceRoster は Artist に紐づく

class Performance(Base):
    __tablename__ = 'performances'
    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(Integer, ForeignKey('artists.id'))
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True)
    performance_type = Column(String(100)) # "Tour", "One-Man", "Festival"
    name = Column(String(255))
    date = Column(Date)
    venue = Column(String(255), nullable=True)

    open_time = Column(Time, nullable=True)     # 開場時間
    start_time = Column(Time, nullable=True)    # 開演時間
    end_time = Column(Time, nullable=True)      # 終演時間 (セッション終了)
    stage_name = Column(String, nullable=True)  # フェスなどのステージ名

    artist = relationship("Artist", back_populates="performances")
    # performance.artist_id に紐づくアーティスト情報を取得するためのリレーションシップ
    main_artist = relationship("Artist", primaryjoin="Performance.artist_id == Artist.id", uselist=False, back_populates="performances")
    tour = relationship("Tour", back_populates="performances")
    setlist_entries = relationship("SetlistEntry", back_populates="performance")
    roster_entries = relationship("PerformanceRoster", back_populates="performance", cascade="all, delete-orphan")
    setlist_entries = relationship(
        "SetlistEntry", 
        back_populates="performance", 
        cascade="all, delete-orphan",
        order_by="SetlistEntry.order_index" # ★ ここでソート順を定義
    )

class SetlistEntry(Base):
    __tablename__ = 'setlist_entries'
    id = Column(Integer, primary_key=True, index=True)
    performance_id = Column(Integer, ForeignKey('performances.id'))
    song_id = Column(Integer, ForeignKey('songs.id'))
    order_index = Column(Integer)
    notes = Column(String(100), nullable=True) # "Encore 1"

    performance = relationship("Performance", back_populates="setlist_entries")
    song = relationship("Song", back_populates="setlist_entries")

class Album(Base):
    __tablename__ = 'albums'
    id = Column(Integer, primary_key=True, index=True)
    main_title = Column(String(255), nullable=False) 
    version_title = Column(String(255), nullable=True) 
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=True)
    physical_release_date = Column(Date, nullable=True) # CD発売日
    digital_release_date = Column(Date, nullable=True)  # 配信開始日
    spotify_album_id = Column(String(100), nullable=True, unique=True)
    
    album_tracks = relationship("AlbumTrack", back_populates="album")
    store_bonuses = relationship("AlbumStoreBonus", back_populates="album", cascade="all, delete-orphan")

    # (アルバム同士の関連)
    relationships_as_parent = relationship(
        "AlbumRelationship",
        primaryjoin="Album.id == AlbumRelationship.album_id_1",
        back_populates="album_parent",
        cascade="all, delete-orphan"
    )
    relationships_as_child = relationship(
        "AlbumRelationship",
        primaryjoin="Album.id == AlbumRelationship.album_id_2",
        back_populates="album_child",
        cascade="all, delete-orphan"
    )

class AlbumTrack(Base):
    __tablename__ = 'album_tracks'
    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey('albums.id'))
    song_id = Column(Integer, ForeignKey('songs.id'))
    track_number = Column(Integer)
    disc_number = Column(Integer, default=1)
    
    __table_args__ = (
        UniqueConstraint('album_id', 'song_id', name='_album_song_uc'),
        UniqueConstraint('album_id', 'disc_number', 'track_number', name='_album_track_order_uc'),
    )
    
    album = relationship("Album", back_populates="album_tracks")
    song = relationship("Song", back_populates="album_links")

class AlbumRelationship(Base):
    """
    アルバム同士の関連 (初回盤/通常盤, 特典DVD)
    """
    __tablename__ = 'album_relationships'
    
    id = Column(Integer, primary_key=True, index=True)
    album_id_1 = Column(Integer, ForeignKey('albums.id')) # 親 (例: 初回盤)
    album_id_2 = Column(Integer, ForeignKey('albums.id')) # 子 (例: 特典DVD, 通常盤)
    relationship_type = Column(String(100), nullable=False) # "Includes", "Version Of"

    __table_args__ = (
        UniqueConstraint('album_id_1', 'album_id_2', 'relationship_type', name='_album_relationship_uc'),
    )
    
    # リレーションシップの定義
    album_parent = relationship("Album", foreign_keys=[album_id_1], back_populates="relationships_as_parent")
    album_child = relationship("Album", foreign_keys=[album_id_2], back_populates="relationships_as_child")

class Tag(Base):
    """
    タグ・マスター (お気に入り, バラード, ライブ定番曲 など)
    """
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True) # タグ名は重複禁止
    color = Column(String(20), nullable=True) # UI用 (例: "#FF0000")
    
    # このタグが紐づく Artist / Song へのリレーション
    artists = relationship(
        "Artist",
        secondary=artist_tags,
        back_populates="tags"
    )
    songs = relationship(
        "Song",
        secondary=song_tags,
        back_populates="tags"
    )

class Merchandise(Base):
    """
    グッズ・マスター
    """
    __tablename__ = 'merchandise'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    merch_type = Column(String(100), nullable=True) # "Live Goods", "Album Bonus"
    
    # このグッズが関連するツアー
    tours = relationship(
        "Tour",
        secondary=tour_merchandise,
        back_populates="merchandise"
    )
    # このグッズが関連する店舗特典
    album_bonuses = relationship("AlbumStoreBonus", back_populates="merchandise", cascade="all, delete-orphan")

    relationships_as_parent = relationship(
        "MerchandiseRelationship",
        primaryjoin="Merchandise.id == MerchandiseRelationship.merchandise_id_2",
        back_populates="merch_parent",
        cascade="all, delete-orphan"
    )
    relationships_as_child = relationship(
        "MerchandiseRelationship",
        primaryjoin="Merchandise.id == MerchandiseRelationship.merchandise_id_1",
        back_populates="merch_child",
        cascade="all, delete-orphan"
    )

class MerchandiseRelationship(Base):
    """
    グッズ同士の関連 (親子関係・バリエーション)
    """
    __tablename__ = 'merchandise_relationships'
    
    id = Column(Integer, primary_key=True, index=True)
    merchandise_id_1 = Column(Integer, ForeignKey('merchandise.id')) # 子 (例: Tシャツ(白))
    merchandise_id_2 = Column(Integer, ForeignKey('merchandise.id')) # 親 (例: Tシャツ)
    relationship_type = Column(String(100), nullable=False) # "Variation Of"

    __table_args__ = (
        UniqueConstraint('merchandise_id_1', 'merchandise_id_2', 'relationship_type', name='_merch_relationship_uc'),
    )
    
    # リレーションシップの定義
    merch_child = relationship("Merchandise", foreign_keys=[merchandise_id_1], back_populates="relationships_as_parent")
    merch_parent = relationship("Merchandise", foreign_keys=[merchandise_id_2], back_populates="relationships_as_child")

class Store(Base):
    """
    店舗マスター
    """
    __tablename__ = 'stores'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    
    # この店舗が関連する特典
    album_bonuses = relationship("AlbumStoreBonus", back_populates="store", cascade="all, delete-orphan")

class AlbumStoreBonus(Base):
    """
    店舗別特典紐付け (中間テーブル)
    """
    __tablename__ = 'album_store_bonuses'
    
    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey('albums.id'))
    store_id = Column(Integer, ForeignKey('stores.id'))
    merchandise_id = Column(Integer, ForeignKey('merchandise.id'))
    
    __table_args__ = (
        UniqueConstraint('album_id', 'store_id', 'merchandise_id', name='_album_store_merch_uc'),
    )
    
    album = relationship("Album", back_populates="store_bonuses")
    store = relationship("Store", back_populates="album_bonuses")
    merchandise = relationship("Merchandise", back_populates="album_bonuses")

class User(Base):
    """
    ユーザー・マスター (v4.2)
    """
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True) # ログインID
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False) # ハッシュ化されたパスワード
    created_at = Column(DateTime, default=datetime.datetime.now)
    
    # このユーザーの所有物・参加履歴へのリレーション
    possessions = relationship("UserPossession", back_populates="owner", cascade="all, delete-orphan")
    attendance_history = relationship("UserAttendance", back_populates="owner", cascade="all, delete-orphan")

class UserPossession(Base):
    """
    ユーザーの所有物 (v4.2)
    """
    __tablename__ = 'user_possessions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id')) # ★ 誰の所有物か
    entity_type = Column(String(100), nullable=False) # "album", "merchandise"
    entity_id = Column(Integer, nullable=False) # (albums.id または merchandise.id)
    status = Column(String(100), nullable=True) # "Owned", "Wishlist"
    notes = Column(Text, nullable=True)
    
    owner = relationship("User", back_populates="possessions")

class UserAttendance(Base):
    """
    ユーザーの公演参加履歴 (v4.2)
    """
    __tablename__ = 'user_attendance'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id')) # ★ 誰の参加履歴か
    performance_id = Column(Integer, ForeignKey('performances.id'))
    status = Column(String(100), nullable=True) # "Attended", "Ticketed"
    notes = Column(Text, nullable=True)
    
    owner = relationship("User", back_populates="attendance_history")
    performance = relationship("Performance") # (簡易的な一方向のリレーション)

# --- 3. データベースの初期化関数 ---
def create_db_and_tables():
    # この関数を呼び出すと、SQLiteファイルと全テーブルが作成されます
    Base.metadata.create_all(bind=engine)

# データベースセッションを取得するための依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

