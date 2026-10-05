import pytest
from backend import models

def test_update_album_group_artist_propagation(client, db_session):
    """
    アルバムグループのアーティストを変更した際に、
    紐づく楽曲(Song)のメインアーティストにも伝播するかを検証するテスト
    """
    # 1. 既存データのセットアップ
    artist1 = models.Artist(name="Artist A")
    artist2 = models.Artist(name="Artist B")
    db_session.add(artist1)
    db_session.add(artist2)
    db_session.flush()

    group = models.AlbumGroup(title="Test Group", artist_id=artist1.id)
    db_session.add(group)
    db_session.flush()

    album = models.Album(main_title="Test Album", album_group_id=group.id)
    db_session.add(album)
    db_session.flush()

    song1 = models.Song(title="Song 1")
    song2 = models.Song(title="Song 2")
    db_session.add_all([song1, song2])
    db_session.flush()

    # Track設定
    track1 = models.AlbumTrack(album_id=album.id, song_id=song1.id, disc_number=1, track_number=1)
    track2 = models.AlbumTrack(album_id=album.id, song_id=song2.id, disc_number=1, track_number=2)
    db_session.add_all([track1, track2])
    db_session.flush()

    # SongArtistLink の初期状態 (Artist A)
    link1 = models.SongArtistLink(song_id=song1.id, artist_id=artist1.id, role_category="Artist")
    # song2はあえてArtistを設定していない状態にする (それでも伝播で追加されるか検証)
    db_session.add(link1)
    db_session.commit()

    # 2. PUT /album-groups/{group_id} で artist_id を artist2.id に変更
    update_data = {"artist_id": artist2.id}
    response = client.put(f"/album-groups/{group.id}", json=update_data)
    assert response.status_code == 200

    # 3. 伝播の検証
    # song1のArtistLinkが Artist B になっていること
    links1 = db_session.query(models.SongArtistLink).filter(
        models.SongArtistLink.song_id == song1.id,
        models.SongArtistLink.role_category == "Artist"
    ).all()
    assert len(links1) == 1
    assert links1[0].artist_id == artist2.id

    # song2のArtistLinkにも Artist B が追加されていること
    links2 = db_session.query(models.SongArtistLink).filter(
        models.SongArtistLink.song_id == song2.id,
        models.SongArtistLink.role_category == "Artist"
    ).all()
    assert len(links2) == 1
    assert links2[0].artist_id == artist2.id

def test_update_album_group_title_propagation(client, db_session):
    """
    アルバムグループのタイトルを変更した際に、
    紐づくすべてのアルバムの main_title にも反映されるかを検証するテスト
    """
    group = models.AlbumGroup(title="Old Group Title")
    db_session.add(group)
    db_session.flush()

    album1 = models.Album(main_title="Old Group Title", album_group_id=group.id)
    album2 = models.Album(main_title="Old Group Title", album_group_id=group.id)
    db_session.add_all([album1, album2])
    db_session.commit()

    # PUT /album-groups/{group_id} で title を変更
    update_data = {"title": "New Group Title"}
    response = client.put(f"/album-groups/{group.id}", json=update_data)
    assert response.status_code == 200

    # 伝播の検証
    db_session.refresh(album1)
    db_session.refresh(album2)
    assert album1.main_title == "New Group Title"
    assert album2.main_title == "New Group Title"

def test_update_album_group_type_propagation(client, db_session):
    """
    アルバムグループの区分(album_type)を変更した際に、
    紐づくすべてのアルバムの album_type にも反映されるかを検証するテスト
    """
    group = models.AlbumGroup(title="Type Test Group", album_type="album")
    db_session.add(group)
    db_session.flush()

    album1 = models.Album(main_title="Type Test Group", album_type="album", album_group_id=group.id)
    album2 = models.Album(main_title="Type Test Group", album_type="album", album_group_id=group.id)
    db_session.add_all([album1, album2])
    db_session.commit()

    # PUT /album-groups/{group_id} で album_type を変更
    update_data = {"album_type": "single"}
    response = client.put(f"/album-groups/{group.id}", json=update_data)
    assert response.status_code == 200

    # 伝播の検証
    db_session.refresh(album1)
    db_session.refresh(album2)
    assert album1.album_type == "single"
    assert album2.album_type == "single"
