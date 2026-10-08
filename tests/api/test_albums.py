class TestAlbumsAPI:
    """アルバム関連APIのテスト"""

    def test_get_albums_empty(self, client):
        """データが0件の場合、空のリストが返ってくること"""
        response = client.get("/albums")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_album(self, client):
        """正常なデータを与えた場合、アルバムが作成されIDが返ること"""
        album_data = {"main_title": "Test Album", "release_date": "2023-01-01", "album_type": "Original"}
        response = client.post("/albums/", json=album_data)

        assert response.status_code == 200
        data = response.json()
        assert data["main_title"] == "Test Album"
        assert "id" in data

    def test_get_album_detail(self, client):
        """存在するIDを指定した場合、該当のアルバム情報が取得できること"""
        # 事前にテスト用データを作成
        album_data = {"main_title": "Detail Album", "release_date": "2023-01-01", "album_type": "Original"}
        create_response = client.post("/albums/", json=album_data)
        assert create_response.status_code == 200
        album_id = create_response.json()["id"]

        # 詳細取得APIをテスト
        response = client.get(f"/albums/{album_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["main_title"] == "Detail Album"
        assert data["id"] == album_id

    def test_update_album(self, client):
        """アルバム情報（タイトルなど）が更新できること"""
        create_response = client.post("/albums/", json={"main_title": "Before Update"})
        album_id = create_response.json()["id"]

        update_response = client.put(f"/albums/{album_id}", json={"main_title": "After Update", "artist_id": 999})
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["main_title"] == "After Update"
        assert data["artist_id"] == 999

    def test_update_album_disc_media_format_side_effect(self, client, db_session):
        """ディスクのフォーマット更新で、紐づく楽曲のis_videoフラグが連動して更新されること"""
        from backend.models import Album, AlbumDisc, AlbumTrack, Song

        album = Album(main_title="Album For Disc Update")
        db_session.add(album)
        db_session.commit()
        db_session.refresh(album)

        disc = AlbumDisc(album_id=album.id, disc_number=1, title="Original Disc Name", media_format="CD")
        db_session.add(disc)

        # 紐づく楽曲を作成
        song = Song(title="Test Song", is_video=False)
        db_session.add(song)
        db_session.commit()
        db_session.refresh(song)

        # トラックを作成
        track = AlbumTrack(album_id=album.id, disc_number=1, track_number=1, song_id=song.id)
        db_session.add(track)
        db_session.commit()

        # タイトル変更のみ (media_formatは指定しない)
        update_response = client.put(f"/albums/{album.id}/discs/{disc.id}", json={"title": "Updated Disc Name"})
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Updated Disc Name"

        db_session.refresh(song)
        assert song.is_video is False, "タイトルのみの更新でis_videoが変わってはならない"

        # media_formatをDVDに変更
        update_response2 = client.put(f"/albums/{album.id}/discs/{disc.id}", json={"media_format": "DVD"})
        assert update_response2.status_code == 200

        db_session.refresh(song)
        assert song.is_video is True, "DVDに変更されたためis_videoがTrueになるべき"

        # media_formatをCDに戻す
        update_response3 = client.put(f"/albums/{album.id}/discs/{disc.id}", json={"media_format": "CD"})
        assert update_response3.status_code == 200

        db_session.refresh(song)
        assert song.is_video is False, "CDに変更されたためis_videoがFalseになるべき"

    def test_import_cd_append_mode_with_disc_title(self, client, db_session):
        """スマートテキストインポート等からの追加インポート(append_mode=True)時、ディスクのタイトルが正しく保存されること"""
        from backend.models import Album, AlbumGroup
        from datetime import date

        group = AlbumGroup(title="Target Group", release_date=date(2023, 1, 1), album_type="Original")
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)

        album = Album(main_title="Target Album", album_group_id=group.id)
        db_session.add(album)
        db_session.commit()
        db_session.refresh(album)

        payload = {
            "target_album_id": album.id,
            "title": "Target Album",
            "append_mode": True,
            "discs": [{"disc_number": 2, "title": "Bonus DVD", "media_format": "DVD"}],
            "tracks": [{"disc_number": 2, "track_number": 1, "title": "Bonus Track 1"}],
        }

        response = client.post("/albums/import-cd", json=payload)
        assert response.status_code == 200

        # ディスクが追加されてタイトルが保存されたか確認
        from backend.models import AlbumDisc

        disc2 = db_session.query(AlbumDisc).filter(AlbumDisc.album_id == album.id, AlbumDisc.disc_number == 2).first()

        assert disc2 is not None
        assert disc2.title == "Bonus DVD"
        assert disc2.media_format == "DVD"

    def test_reorder_album_discs(self, client, db_session):
        """ディスクの並び替え(reorder)が正しく行われること"""
        from backend.models import Album, AlbumDisc, AlbumTrack

        album = Album(main_title="Album For Reorder")
        db_session.add(album)
        db_session.commit()
        db_session.refresh(album)

        # 3枚のディスクを作成
        for i in range(1, 4):
            disc = AlbumDisc(album_id=album.id, disc_number=i, title=f"Disc {i}")
            db_session.add(disc)
            # 各ディスクに1曲ずつトラックを作成
            track = AlbumTrack(
                album_id=album.id, disc_number=i, track_number=1, song_id=1
            )  # song_id=1 exists from conftest or will fail constraint?
            # Wait, song_id=1 might not exist. Let's create a dummy song.
            db_session.add(track)

        # song_id 制約を回避するためSongを作成
        from backend.models import Song

        song = Song(title="Dummy")
        db_session.add(song)
        db_session.commit()
        db_session.refresh(song)

        for track in db_session.query(AlbumTrack).filter(AlbumTrack.album_id == album.id).all():
            track.song_id = song.id
        db_session.commit()

        # 並び替え: 元の[1, 2, 3] を [3, 1, 2] にする
        # つまり、Disc 3 -> Disc 1, Disc 1 -> Disc 2, Disc 2 -> Disc 3
        payload = {"original_disc_numbers": [3, 1, 2]}
        response = client.post(f"/albums/{album.id}/discs/reorder", json=payload)
        assert response.status_code == 200

        # DBを確認
        discs = db_session.query(AlbumDisc).filter(AlbumDisc.album_id == album.id).order_by(AlbumDisc.disc_number).all()
        assert len(discs) == 3
        assert discs[0].title == "Disc 3"
        assert discs[1].title == "Disc 1"
        assert discs[2].title == "Disc 2"

        tracks = (
            db_session.query(AlbumTrack).filter(AlbumTrack.album_id == album.id).order_by(AlbumTrack.disc_number).all()
        )
        assert tracks[0].disc_number == 1
        assert tracks[1].disc_number == 2
        assert tracks[2].disc_number == 3

    def test_import_cd_apply_artist_to_existing_tracks(self, client, db_session):
        """インポート時に apply_artist_to_tracks がTrueの場合、既存楽曲のメインアーティストも設定されること"""
        from backend.models import Album, AlbumGroup, Artist, Song, SongArtistLink
        from datetime import date

        artist = Artist(name="Import Artist")
        db_session.add(artist)
        db_session.commit()
        db_session.refresh(artist)

        group = AlbumGroup(title="Target Group", release_date=date(2023, 1, 1), artist_id=artist.id)
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)

        album = Album(main_title="Target Album", album_group_id=group.id)
        db_session.add(album)
        db_session.commit()
        db_session.refresh(album)

        existing_song = Song(title="Existing Song")
        db_session.add(existing_song)
        db_session.commit()
        db_session.refresh(existing_song)

        payload = {
            "target_album_id": album.id,
            "title": "Target Album",
            "apply_artist_to_tracks": True,
            "discs": [{"disc_number": 1, "title": "Disc 1", "media_format": "CD"}],
            "tracks": [{"disc_number": 1, "track_number": 1, "title": "Existing Song", "song_id": existing_song.id}],
        }

        response = client.post("/albums/import-cd", json=payload)
        assert response.status_code == 200

        # SongArtistLink が作成されているか確認
        links = (
            db_session.query(SongArtistLink)
            .filter(SongArtistLink.song_id == existing_song.id, SongArtistLink.role_category == "Artist")
            .all()
        )
        assert len(links) == 1
        assert links[0].artist_id == artist.id

    def test_import_cd_replace_disc(self, client, db_session):
        """特定のディスクのみを置換し、孤立した楽曲が削除されることのテスト"""
        from backend.models import AlbumGroup, Album, AlbumDisc, AlbumTrack, Song

        album = Album(main_title="Target Album")
        db_session.add(album)
        db_session.flush()

        # Disc 1 and its track
        disc1 = AlbumDisc(album_id=album.id, disc_number=1, title="Disc 1")
        song1 = Song(title="Song 1")
        db_session.add_all([disc1, song1])
        db_session.flush()
        track1 = AlbumTrack(album_id=album.id, song_id=song1.id, disc_number=1, track_number=1)
        db_session.add(track1)

        # Disc 2 and its track
        disc2 = AlbumDisc(album_id=album.id, disc_number=2, title="Disc 2")
        song2 = Song(title="Song 2")  # This song should be deleted later
        db_session.add_all([disc2, song2])
        db_session.flush()
        track2 = AlbumTrack(album_id=album.id, song_id=song2.id, disc_number=2, track_number=1)
        db_session.add(track2)

        # Song 3 is also in Disc 2, but it's used elsewhere, so it shouldn't be deleted
        song3 = Song(title="Song 3")
        db_session.add(song3)
        db_session.flush()
        track3 = AlbumTrack(album_id=album.id, song_id=song3.id, disc_number=2, track_number=2)
        other_track = AlbumTrack(album_id=album.id, song_id=song3.id, disc_number=1, track_number=2)
        db_session.add_all([track3, other_track])

        db_session.commit()

        # Disc 2を置換するリクエスト
        payload = {
            "target_album_id": album.id,
            "title": "Target Album",
            "append_mode": True,
            "replace_disc_number": 2,  # Disc 2を置換
            "discs": [{"disc_number": 2, "title": "Replaced Disc 2", "media_format": "CD"}],
            "tracks": [{"disc_number": 2, "track_number": 1, "title": "New Song for Disc 2", "song_id": None}],
        }

        response = client.post("/albums/import-cd", json=payload)
        assert response.status_code == 200, response.text

        db_session.expire_all()

        # Disc 1 はそのまま残っていること
        assert db_session.query(AlbumDisc).filter_by(disc_number=1).first() is not None
        assert db_session.query(AlbumTrack).filter_by(disc_number=1, track_number=1).first() is not None
        assert db_session.query(AlbumTrack).filter_by(disc_number=1, track_number=2).first() is not None

        # Disc 2 は新しいタイトルになっていること
        new_disc2 = db_session.query(AlbumDisc).filter_by(disc_number=2).first()
        assert new_disc2.title == "Replaced Disc 2"

        # Disc 2 のトラックは1曲だけになっていること
        disc2_tracks = db_session.query(AlbumTrack).filter_by(disc_number=2).all()
        assert len(disc2_tracks) == 1

        # song2 はどこにも使われていないので削除されていること
        assert db_session.query(Song).filter_by(id=song2.id).first() is None

        # song3 は Disc 1 で使われているので残っていること
        assert db_session.query(Song).filter_by(id=song3.id).first() is not None

    def test_delete_album_disc_cleanup(self, client, db_session):
        """ディスク削除時にトラックと孤立した楽曲が正しく削除されることのテスト"""
        from backend.models import AlbumGroup, Album, AlbumDisc, AlbumTrack, Song

        album = Album(main_title="Target Album")
        db_session.add(album)
        db_session.flush()

        # Disc 1 and its track
        disc1 = AlbumDisc(album_id=album.id, disc_number=1, title="Disc 1")
        song1 = Song(title="Song 1")  # This song should be deleted later
        db_session.add_all([disc1, song1])
        db_session.flush()
        track1 = AlbumTrack(album_id=album.id, song_id=song1.id, disc_number=1, track_number=1)
        db_session.add(track1)

        # Disc 2 and its track
        disc2 = AlbumDisc(album_id=album.id, disc_number=2, title="Disc 2")
        song2 = Song(title="Song 2")  # This song should NOT be deleted as it's used in Disc 1 too
        db_session.add_all([disc2, song2])
        db_session.flush()
        track2 = AlbumTrack(album_id=album.id, song_id=song2.id, disc_number=2, track_number=1)
        track2_other = AlbumTrack(album_id=album.id, song_id=song2.id, disc_number=1, track_number=2)
        db_session.add_all([track2, track2_other])

        db_session.commit()

        # Disc 1を削除するリクエスト
        response = client.delete(f"/albums/{album.id}/discs/{disc1.id}")
        assert response.status_code == 200

        db_session.expire_all()

        # Disc 1自体が削除されていること (元のdisc1のIDは存在しない)
        assert db_session.query(AlbumDisc).filter_by(id=disc1.id).first() is None

        # Disc 2が繰り上がってDisc 1になっていること
        new_disc1 = db_session.query(AlbumDisc).filter_by(id=disc2.id).first()
        assert new_disc1.disc_number == 1

        # Disc 1のトラックは、元のDisc 2のトラックのみになっていること
        tracks = db_session.query(AlbumTrack).filter_by(album_id=album.id, disc_number=1).all()
        assert len(tracks) == 1
        assert tracks[0].song_id == song2.id

        # song1は他で使われていないので削除されていること
        assert db_session.query(Song).filter_by(id=song1.id).first() is None

        # song2は残っていること
        assert db_session.query(Song).filter_by(id=song2.id).first() is not None

    def test_update_album_track_partial(self, client, db_session):
        import uuid
        from backend import models

        artist = models.Artist(name=f"Test Artist {uuid.uuid4()}")
        db_session.add(artist)
        db_session.commit()

        song = models.Song(title="Test Song")
        db_session.add(song)
        db_session.commit()

        album = models.Album(main_title="Test Album")
        db_session.add(album)
        db_session.commit()

        track = models.AlbumTrack(
            album_id=album.id, disc_number=1, track_number=1, song_id=song.id, notes="Initial Note"
        )
        db_session.add(track)
        db_session.commit()

        # Test updating to empty string
        response = client.put(f"/albums/{album.id}/tracks/{track.id}", json={"notes": ""})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["notes"] == ""

        # Test updating to None
        response = client.put(f"/albums/{album.id}/tracks/{track.id}", json={"notes": None})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["notes"] is None

        # Test not sending notes at all (should remain None)
        response = client.put(f"/albums/{album.id}/tracks/{track.id}", json={"display_title": "New Display"})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["notes"] is None
        assert data["display_title"] == "New Display"


    # Verify the update happened
    get_res = client.get(f"/album-groups/{group_id}")
    tracks = get_res.json()["albums"][0]["album_tracks"]
    for t in tracks:
