import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload
import models

engine = create_engine("sqlite:///./music_curation_desk.db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

song = db.query(models.Song).options(
    joinedload(models.Song.artist_links).joinedload(models.SongArtistLink.artist)
).filter(models.Song.id == 374).first()

print("Song:", song.title)
print("Artist Links:", song.artist_links)
for link in song.artist_links:
    print("  Artist:", link.artist.name if link.artist else "None")
