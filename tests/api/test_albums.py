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
