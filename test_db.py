import traceback
from app.models import SessionLocal
from app import models
db = SessionLocal()
try:
    album = db.query(models.Album).filter(models.Album.id == 53).first()
    print("Album:", album.main_title)
    for track in album.album_tracks:
        print(track.track_number, track.song.title)
except Exception as e:
    traceback.print_exc()
