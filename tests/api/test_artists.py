class TestArtistsAPI:
    """アーティストAPIのテスト"""

    def test_get_artists_empty(self, client):
        """データが0件の場合、空のリストが返ってくること"""
        response = client.get("/artists/")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_artist(self, client):
        """正常なデータを与えた場合、アーティストが作成されIDが返ること"""
        artist_data = {
            "name": "Test Artist"
        }
        response = client.post("/artists/", json=artist_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Artist"
        assert "id" in data
