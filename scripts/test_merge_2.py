import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import SessionLocal, Song, Album, AlbumTrack, MusicalWork
from backend.routers.songs import merge_song

db = SessionLocal()

work = MusicalWork(title="Test Work")
db.add(work)
db.commit()

target = Song(title="Target", work_id=work.id)
source = Song(title="Source", work_id=work.id)
db.add_all([target, source])
db.commit()

album = Album(main_title="Test Album")
db.add(album)
db.commit()

at = AlbumTrack(album_id=album.id, song_id=source.id, track_number=1, disc_number=1)
db.add(at)
db.commit()

at_id = at.id
print(f"Before merge: Target has {len(target.album_links)} albums, Source has {len(source.album_links)} albums")

try:
    merge_song(source.id, target.id, db)
    print("Merge successful")
except Exception as e:
    print("Merge failed:", e)

# verify directly in DB
at_db = db.query(AlbumTrack).filter(AlbumTrack.id == at_id).first()
if at_db:
    print(f"After merge: AlbumTrack exists, song_id={at_db.song_id}")
else:
    print("After merge: AlbumTrack DELETED")

target = db.query(Song).filter(Song.id == target.id).first()
print(f"After merge: Target has {len(target.album_links)} albums")
