class TestAlbumsAPI:
    """アルバム関連APIのテスト"""

    def test_get_albums_empty(self, client):
        """データが0件の場合、空のリストが返ってくること"""
        response = client.get("/albums")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_album(self, client):
        """正常なデータを与えた場合、アルバムが作成されIDが返ること"""
        album_data = {
            "main_title": "Test Album",
            "release_date": "2023-01-01",
            "album_type": "Original"
        }
        response = client.post("/albums/", json=album_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["main_title"] == "Test Album"
        assert "id" in data

    def test_get_album_detail(self, client):
        """存在するIDを指定した場合、該当のアルバム情報が取得できること"""
        # 事前にテスト用データを作成
        album_data = {
            "main_title": "Detail Album",
            "release_date": "2023-01-01",
            "album_type": "Original"
        }
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
        update_response = client.put(
            f"/albums/{album.id}/discs/{disc.id}",
            json={"title": "Updated Disc Name"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Updated Disc Name"
        
        db_session.refresh(song)
        assert song.is_video is False, "タイトルのみの更新でis_videoが変わってはならない"
        
        # media_formatをDVDに変更
        update_response2 = client.put(
            f"/albums/{album.id}/discs/{disc.id}",
            json={"media_format": "DVD"}
        )
        assert update_response2.status_code == 200
        
        db_session.refresh(song)
        assert song.is_video is True, "DVDに変更されたためis_videoがTrueになるべき"

        # media_formatをCDに戻す
        update_response3 = client.put(
            f"/albums/{album.id}/discs/{disc.id}",
            json={"media_format": "CD"}
        )
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
            "discs": [
                {
                    "disc_number": 2,
                    "title": "Bonus DVD",
                    "media_format": "DVD"
                }
            ],
            "tracks": [
                {
                    "disc_number": 2,
                    "track_number": 1,
                    "title": "Bonus Track 1"
                }
            ]
        }

        response = client.post("/albums/import-cd", json=payload)
        assert response.status_code == 200

        # ディスクが追加されてタイトルが保存されたか確認
        from backend.models import AlbumDisc
        disc2 = db_session.query(AlbumDisc).filter(
            AlbumDisc.album_id == album.id, 
            AlbumDisc.disc_number == 2
        ).first()

        assert disc2 is not None
        assert disc2.title == "Bonus DVD"
        assert disc2.media_format == "DVD"
