import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
from app.models import SessionLocal
from app import models

db = SessionLocal()
albums = db.query(models.Album).filter(models.Album.main_title == 'test').all()
for a in albums:
    print(f"Found Album: {a.id} - {a.main_title}")
    # Also check songs
    tracks = db.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == a.id).all()
    print(f"  Tracks: {len(tracks)}")
    for t in tracks:
        print(f"  Track: {t.song.title}")

songs = db.query(models.Song).filter(models.Song.title == 'test').all()
for s in songs:
    print(f"Found Song: {s.id} - {s.title}")

artists = db.query(models.Artist).filter(models.Artist.name == 'test').all()
for a in artists:
    print(f"Found Artist: {a.id} - {a.name}")

db.close()
