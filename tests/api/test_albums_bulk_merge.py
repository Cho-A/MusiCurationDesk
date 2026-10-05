from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.dependencies import get_db
from backend import models
import pytest

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_bulk_merge_disc_copy_to_new_disc(db_session):
    import uuid
    artist = models.Artist(name=f"Test Artist {uuid.uuid4()}")
    db_session.add(artist)
    db_session.commit()

    song1 = models.Song(title="Song 1")
    song2 = models.Song(title="Song 2")
    db_session.add_all([song1, song2])
    db_session.commit()

    source_album = models.Album(main_title="Source Album")
    target_album = models.Album(main_title="Target Album")
    db_session.add_all([source_album, target_album])
    db_session.commit()

    source_disc = models.AlbumDisc(album_id=source_album.id, disc_number=1, title="Source Disc")
    target_disc_existing = models.AlbumDisc(album_id=target_album.id, disc_number=1, title="Target Disc 1")
    db_session.add_all([source_disc, target_disc_existing])
    db_session.commit()

    t1 = models.AlbumTrack(album_id=source_album.id, disc_number=1, track_number=1, song_id=song1.id)
    t2 = models.AlbumTrack(album_id=source_album.id, disc_number=1, track_number=2, song_id=song2.id)
    db_session.add_all([t1, t2])
    db_session.commit()

    # Call API to copy disc to target_album as a new disc (-1)
    payload = {
        "target_album_id": target_album.id,
        "target_disc_number": -1
    }
    response = client.post(f"/albums/{source_album.id}/discs/1/merge", json=payload)
    assert response.status_code == 200, response.text
    
    data = response.json()
    assert data["merged_count"] == 2
    
    # Verify target album now has a disc 2 with the same tracks
    target_discs = db_session.query(models.AlbumDisc).filter_by(album_id=target_album.id).order_by(models.AlbumDisc.disc_number).all()
    assert len(target_discs) == 2
    assert target_discs[1].disc_number == 2
    assert target_discs[1].title == "Source Disc"
    
    target_tracks_disc2 = db_session.query(models.AlbumTrack).filter_by(album_id=target_album.id, disc_number=2).order_by(models.AlbumTrack.track_number).all()
    assert len(target_tracks_disc2) == 2
    assert target_tracks_disc2[0].song_id == song1.id
    assert target_tracks_disc2[1].song_id == song2.id

    # Verify source album still has its tracks (it was a copy, not a move)
    source_tracks = db_session.query(models.AlbumTrack).filter_by(album_id=source_album.id, disc_number=1).all()
    assert len(source_tracks) == 2
