import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backend.services.credit_fetcher import MusicImporter
from backend.models import SessionLocal, Song

def test():
    db = SessionLocal()
    importer = MusicImporter()
    print("Importing 'オリオンをなぞる' (0opkjjC7nn6YO8NXzkDAPP) ...")
    song = importer.import_track_from_spotify("0opkjjC7nn6YO8NXzkDAPP", db)
    print(f"Imported Song: {song.title} (ID: {song.id})")
    print("Credits:")
    for link in song.artist_links:
        print(f" - {link.artist.name} ({link.role})")
    db.close()

if __name__ == "__main__":
    test()
