from unittest.mock import patch

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

    def test_get_recent_songs(self, client):
        """最近の曲だけ表示されること"""
        # 複数作成
        client.post("/songs/", json={"title": "Song 1"})
        client.post("/songs/", json={"title": "Song 2"})
        client.post("/songs/", json={"title": "Song 3"})

        response = client.get("/songs/recent?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # 最も新しく作成されたものが先頭に来る想定 (idの降順など)
        assert data[0]["title"] == "Song 3"

    def test_update_song_version(self, client):
        """楽曲のバージョン管理ができること"""
        res = client.post("/songs/", json={"title": "Original Song"})
        song_id = res.json()["id"]

        # バージョン情報の更新
        update_res = client.put(f"/songs/{song_id}", json={
            "title": "Original Song",
            "version_name": "Acoustic Ver.",
            "work_id": 1  # 仮想のマスター作品ID
        })
        assert update_res.status_code == 200
        data = update_res.json()

    def test_get_song_detail_with_album_links(self, client):
        """楽曲詳細を取得した際、収録アルバム(album_links)にsong_titleとis_videoが含まれること"""
        # 1. 曲を作成
        song_res = client.post("/songs/", json={"title": "Test Song For Album", "is_video": True})
        song_id = song_res.json()["id"]

        # 2. アルバムを作成
        album_res = client.post("/albums/", json={"main_title": "Test Album", "album_type": "Original"})
        album_id = album_res.json()["id"]

        # 3. アルバムに曲を紐付ける
        client.post(f"/album_tracks/", json={
            "album_id": album_id,
            "song_id": song_id,
            "track_number": 1,
            "disc_number": 1
        })

        # 4. 曲詳細を取得
        detail_res = client.get(f"/songs/{song_id}")
        assert detail_res.status_code == 200
        data = detail_res.json()
        assert "album_links" in data
        assert len(data["album_links"]) == 1
        track = data["album_links"][0]
        
        # schemas.AlbumTrackInfo の song_title と is_video が正しくシリアライズされていること
        assert track["song_title"] == "Test Song For Album"
        assert track["is_video"] is False

    def test_link_and_detach_artist(self, client):
        """楽曲の関連付け、また間違って関連付けられた楽曲の切り離しができること"""
        song_res = client.post("/songs/", json={"title": "Link Song"})
        song_id = song_res.json()["id"]

        artist_res = client.post("/artists/", json={"name": "Link Artist"})
        artist_id = artist_res.json()["id"]

        # 関連付け
        link_res = client.post(
            f"/songs/{song_id}/artists",
            json={
                "song_id": song_id,
                "artist_id": artist_id,
                "role_category": "Vocalist"
            }
        )
        assert link_res.status_code == 200

        # 切り離し (role_categoryが必須のクエリパラメータ)
        detach_res = client.delete(f"/songs/{song_id}/artists/{artist_id}?role_category=Vocalist")
        assert detach_res.status_code == 204

    @patch("backend.services.spotify_client.SpotifyClient.search_tracks")
    def test_spotify_search_mocked(self, mock_search, client):
        """Spotifyからの楽曲検索ができること(モック)"""
        mock_search.return_value = [
            {
                "id": "test_spotify_id",
                "name": "Mocked Song",
                "artists": [{"name": "Mocked Artist"}],
                "album": {
                    "name": "Mocked Album",
                    "images": [{"url": "http://example.com/img.jpg"}]
                }
            }
        ]

        response = client.get("/external/spotify/search?q=Mocked")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Mocked Song"
        assert data[0]["spotify_id"] == "test_spotify_id"

    def test_attach_song_to_song(self, client):
        """未統合の楽曲同士を結合した際、新しいMusicalWorkが自動作成されること"""
        song1_res = client.post("/songs/", json={"title": "Standalone 1"})
        song1_id = song1_res.json()["id"]

        song2_res = client.post("/songs/", json={"title": "Standalone 2"})
        song2_id = song2_res.json()["id"]

        # attach_to_songを実行
        attach_res = client.post(f"/songs/{song1_id}/attach_to_song?target_song_id={song2_id}")
        assert attach_res.status_code == 200
        data = attach_res.json()
        work_id = data["work_id"]
        assert work_id is not None

        # 両方の曲が同じwork_idを持っているか確認
        s1 = client.get(f"/songs/{song1_id}").json()
        s2 = client.get(f"/songs/{song2_id}").json()
        assert s1["work_id"] == work_id
        assert s2["work_id"] == work_id
        
        # 楽曲詳細取得APIが500エラーを出さずに、other_versionsが含まれるか確認
        assert len(s1["other_versions"]) == 1
        assert s1["other_versions"][0]["id"] == song2_id
