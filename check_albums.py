import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
from app.models import SessionLocal, Album, Artist
db = SessionLocal()
albums = db.query(Album).all()
for a in albums:
    print(f"{a.id}: {a.main_title} (Artist ID: {a.main_artist_id})")
