import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend import models

def test_delete_album_group_cascade(client: TestClient, db_session: Session):
    """
    アルバムグループを削除した際に、紐づくアルバム、ディスク、トラックが
    正しく削除されるかをテストする
    """
    # 1. アルバムグループの作成
    ag_res = client.post("/album-groups/", json={"title": "Test Group"})
    assert ag_res.status_code == 200
    group_id = ag_res.json()["id"]

    # 2. 紐づくアルバム（エディション）の作成
    al_res = client.post("/albums/", json={
        "album_group_id": group_id,
        "main_title": "Test Group",
        "version_title": "Regular Edition",
        "media_format": "CD"
    })
    assert al_res.status_code == 200
    album_id = al_res.json()["id"]

    # 3. 紐づくディスクの作成
    disc_res = client.post(f"/albums/{album_id}/discs", json={
        "disc_number": 1,
        "title": "Disc 1",
        "media_format": "CD"
    })
    assert disc_res.status_code == 200
    disc_id = disc_res.json()["id"]

    # 4. 楽曲とトラックの作成
    song_res = client.post("/songs/", json={"title": "Test Song"})
    song_id = song_res.json()["id"]

    track_res = client.post("/albums/tracks", json={
        "album_id": album_id,
        "song_id": song_id,
        "track_number": 1,
        "disc_number": 1
    })
    assert track_res.status_code == 200
    track_id = track_res.json()["id"]

    # 5. DBに正しく保存されているか確認
    assert db_session.query(models.AlbumGroup).filter_by(id=group_id).first() is not None
    assert db_session.query(models.Album).filter_by(id=album_id).first() is not None
    assert db_session.query(models.AlbumDisc).filter_by(id=disc_id).first() is not None
    assert db_session.query(models.AlbumTrack).filter_by(id=track_id).first() is not None

    # 6. アルバムグループの削除実行
    del_res = client.delete(f"/album-groups/{group_id}")
    assert del_res.status_code == 200

    # 7. すべてカスケード削除されているか確認
    assert db_session.query(models.AlbumGroup).filter_by(id=group_id).first() is None
    assert db_session.query(models.Album).filter_by(id=album_id).first() is None
    assert db_session.query(models.AlbumDisc).filter_by(id=disc_id).first() is None
    assert db_session.query(models.AlbumTrack).filter_by(id=track_id).first() is None


def test_delete_album_group_not_found(client: TestClient):
    """
    存在しないアルバムグループIDを指定した場合は404エラーになることをテストする
    """
    res = client.delete("/album-groups/999999")
    assert res.status_code == 404
