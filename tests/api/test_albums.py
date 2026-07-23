class TestアルバムAPI:
    
    class Test一覧取得:
        def test_データが0件の場合_空のリストが返ってくること(self, client):
            response = client.get("/albums")
            assert response.status_code == 200
            assert response.json() == []

    class Test新規作成:
        def test_正常なデータを与えた場合_アルバムが作成されIDが返ること(self, client):
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

    class Test詳細取得:
        def test_存在するIDを指定した場合_該当のアルバム情報が取得できること(self, client):
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
