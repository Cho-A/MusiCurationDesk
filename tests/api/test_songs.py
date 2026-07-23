class TestSongsAPI:
    """楽曲APIのテスト"""

    def test_get_songs_empty(self, client):
        """データが0件の場合、空のリストが返ってくること"""
        response = client.get("/songs/")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_song(self, client):
        """正常なデータを与えた場合、楽曲が作成されIDが返ること"""
        song_data = {
            "title": "Test Song"
        }
        response = client.post("/songs/", json=song_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Song"
        assert "id" in data
