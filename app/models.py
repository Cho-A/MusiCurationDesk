import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, Table, UniqueConstraint, Index, text
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

# --- 1. データベース接続設定 (まずはSQLite) ---
# (本番ではPostgreSQLのURLに変更します)
SQLALCHEMY_DATABASE_URL = "sqlite:///./music_curation_desk.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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

    song = relationship("Song", back_populates="tieup_links")
    tieup = relationship("Tieup", back_populates="song_links")

class Artist(Base):
    __tablename__ = 'artists'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    spotify_artist_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now)

    aliases = relationship("ArtistAlias", back_populates="artist")
    relationships_a = relationship("ArtistRelationship", foreign_keys="[ArtistRelationship.artist_id_1]")
    relationships_b = relationship("ArtistRelationship", foreign_keys="[ArtistRelationship.artist_id_2]")
    performances = relationship("Performance", back_populates="artist")
    song_links = relationship("SongArtistLink", back_populates="artist")

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
    relationship_type = Column(String(100)) # "Member Of", "Solo Project Of"

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

class Performance(Base):
    __tablename__ = 'performances'
    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(Integer, ForeignKey('artists.id'))
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True)
    performance_type = Column(String(100)) # "Tour", "One-Man", "Festival"
    name = Column(String(255))
    date = Column(Date)
    venue = Column(String(255), nullable=True)

    artist = relationship("Artist", back_populates="performances")
    tour = relationship("Tour", back_populates="performances")
    setlist_entries = relationship("SetlistEntry", back_populates="performance")

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
    title = Column(String(255), nullable=False)
    artist_id = Column(Integer, ForeignKey('artists.id'), nullable=True)
    release_date = Column(Date)
    spotify_album_id = Column(String(100), nullable=True, unique=True)
    
    album_tracks = relationship("AlbumTrack", back_populates="album")

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