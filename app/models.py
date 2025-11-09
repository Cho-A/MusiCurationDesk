import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Date, Table
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

# --- 1. データベース接続設定 (まずはSQLite) ---
# (本番ではPostgreSQLのURLに変更します)
SQLALCHEMY_DATABASE_URL = "sqlite:///./music_curation_desk.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- 2. テーブル定義 (スキーマv2.3) ---

# (中間テーブルの定義)
song_artists_link = Table('song_artists_link', Base.metadata,
    Column('song_id', Integer, ForeignKey('songs.id'), primary_key=True),
    Column('artist_id', Integer, ForeignKey('artists.id'), primary_key=True),
    Column('role', String(100))
)

song_tieups_link = Table('song_tieups_link', Base.metadata,
    Column('song_id', Integer, ForeignKey('songs.id'), primary_key=True),
    Column('tieup_id', Integer, ForeignKey('tieups.id'), primary_key=True),
    Column('context', String(255), nullable=True)
)


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
    songs = relationship("Song", secondary=song_artists_link, back_populates="artists")

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
    jasrac_code = Column(String(50), nullable=True, index=True)
    jasrac_title = Column(String(255), nullable=True)
    lyrics = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now)

    artists = relationship("Artist", secondary=song_artists_link, back_populates="songs")
    tieups = relationship("Tieup", secondary=song_tieups_link, back_populates="songs")
    setlist_entries = relationship("SetlistEntry", back_populates="song")

class Tieup(Base):
    __tablename__ = 'tieups'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100)) # "Anime", "Game"
    songs = relationship("Song", secondary=song_tieups_link, back_populates="tieups")

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