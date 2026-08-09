import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

engine = create_engine("sqlite:///./music_curation_desk.db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Mock current user context for recent/me
# Just test the query
artist_ids_list = [1]
recent_songs = db.query(models.Song).join(
    models.SongArtistLink, models.Song.id == models.SongArtistLink.song_id
).filter(
    models.SongArtistLink.artist_id.in_(artist_ids_list)
).order_by(models.Song.id.desc()).limit(10).all()

for song in recent_songs:
    artist_name = "Unknown Artist"
    if song.artist_links:
        artist_name = song.artist_links[0].artist.name
    print(song.id, song.title, artist_name)
