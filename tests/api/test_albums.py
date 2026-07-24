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

    def test_update_album_disc(self, client, db_session):
        """ディスク情報が更新できること"""
        from backend.models import Album, AlbumDisc
        
        album = Album(main_title="Album For Disc Update")
        db_session.add(album)
        db_session.commit()
        db_session.refresh(album)
        
        disc = AlbumDisc(album_id=album.id, disc_number=1, title="Original Disc Name")
        db_session.add(disc)
        db_session.commit()
        db_session.refresh(disc)
        
        update_response = client.put(
            f"/albums/{album.id}/discs/{disc.id}",
            json={"title": "Updated Disc Name"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["title"] == "Updated Disc Name"
