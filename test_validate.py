from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models, schemas

db = SessionLocal()
db_song = db.query(models.Song).filter(models.Song.id == 6).first()
if db_song.work_id:
    song_model = schemas.SongDetail.model_validate(db_song)
    print("Base:", [a.song_title for a in song_model.album_links])
