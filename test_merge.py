import traceback
from app.models import SessionLocal
from app import models

db = SessionLocal()

try:
    # 1. Create dummy songs
    s1 = models.Song(title="Source Dummy")
    s2 = models.Song(title="Target Dummy")
    db.add(s1)
    db.add(s2)
    db.commit()
    db.refresh(s1)
    db.refresh(s2)

    # 2. Create dummy album track
    track = models.AlbumTrack(album_id=53, song_id=s1.id, track_number=99, disc_number=99)
    db.add(track)
    db.commit()
    db.refresh(track)
    track_id = track.id

    # 3. Test merge logic exactly as in routers/songs.py
    source_song = db.query(models.Song).filter(models.Song.id == s1.id).first()
    target_song_id = s2.id
    
    for album_link in list(source_song.album_links):
        existing = db.query(models.AlbumTrack).filter(
            models.AlbumTrack.album_id == album_link.album_id,
            models.AlbumTrack.disc_number == album_link.disc_number,
            models.AlbumTrack.track_number == album_link.track_number,
            models.AlbumTrack.song_id == target_song_id
        ).first()
        if not existing:
            album_link.song_id = target_song_id
        else:
            db.delete(album_link)
    
    db.commit()
    db.delete(source_song)
    db.commit()

    # 4. Check if track is orphaned
    check_track = db.query(models.AlbumTrack).filter(models.AlbumTrack.id == track_id).first()
    if check_track.song_id is None:
        print("FAIL: song_id is NULL!")
    elif check_track.song_id == s2.id:
        print("PASS: song_id correctly updated to target_song_id!")
    else:
        print("FAIL: song_id is", check_track.song_id)

    # Cleanup
    db.delete(check_track)
    db.delete(s2)
    db.commit()

except Exception as e:
    traceback.print_exc()

