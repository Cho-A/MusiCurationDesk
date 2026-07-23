from backend import models

def test_song_merge_logic(db_session):
    # 1. Create dummy songs
    s1 = models.Song(title="Source Dummy")
    s2 = models.Song(title="Target Dummy")
    db_session.add(s1)
    db_session.add(s2)
    db_session.commit()
    db_session.refresh(s1)
    db_session.refresh(s2)

    # 2. Create dummy album track
    track = models.AlbumTrack(album_id=53, song_id=s1.id, track_number=99, disc_number=99)
    db_session.add(track)
    db_session.commit()
    db_session.refresh(track)
    track_id = track.id

    # 3. Test merge logic
    source_song = db_session.query(models.Song).filter(models.Song.id == s1.id).first()
    target_song_id = s2.id
    
    for album_link in list(source_song.album_links):
        existing = db_session.query(models.AlbumTrack).filter(
            models.AlbumTrack.album_id == album_link.album_id,
            models.AlbumTrack.disc_number == album_link.disc_number,
            models.AlbumTrack.track_number == album_link.track_number,
            models.AlbumTrack.song_id == target_song_id
        ).first()
        if not existing:
            album_link.song_id = target_song_id
        else:
            db_session.delete(album_link)
    
    db_session.commit()
    db_session.delete(source_song)
    db_session.commit()

    # 4. Check if track is updated properly
    check_track = db_session.query(models.AlbumTrack).filter(models.AlbumTrack.id == track_id).first()
    assert check_track is not None
    assert check_track.song_id == s2.id
