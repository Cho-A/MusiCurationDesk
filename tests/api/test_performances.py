class TestPerformancesAPI:
    """公演APIの詳細なビジネスロジックテスト"""

    def test_bulk_update_tour(self, client):
        """複数の公演を一つのツアーに一括で紐付けられること"""
        # ツアー作成
        tour_res = client.post("/tours/", json={"name": "Bulk Test Tour"})
        tour_id = tour_res.json()["id"]

        # 公演を複数作成
        perf1_res = client.post("/performances/", json={
            "name": "Live 1",
            "date": "2023-01-01",
            "performance_type": "Live"
        })
        perf2_res = client.post("/performances/", json={
            "name": "Live 2",
            "date": "2023-01-02",
            "performance_type": "Live"
        })
        perf1_id = perf1_res.json()["id"]
        perf2_id = perf2_res.json()["id"]

        # 一括紐付け
        bulk_res = client.post(
            "/performances/bulk-update-tour",
            json={
                "performance_ids": [perf1_id, perf2_id],
                "tour_id": tour_id
            }
        )
        assert bulk_res.status_code == 200

        # 検証
        updated_perf1 = client.get(f"/performances/{perf1_id}").json()
        assert updated_perf1.get("tour", {}).get("id") == tour_id or updated_perf1.get("tour_id") == tour_id

    def test_bulk_copy_setlist(self, client):
        """同一ツアー内の別公演からセットリストをコピーできること"""
        # 元の公演を作成
        source_perf = client.post("/performances/", json={
            "name": "Source Live",
            "date": "2023-01-01",
            "performance_type": "Live"
        }).json()
        source_id = source_perf["id"]

        # コピー先の公演を作成
        target_perf = client.post("/performances/", json={
            "name": "Target Live",
            "date": "2023-01-02",
            "performance_type": "Live"
        }).json()
        target_id = target_perf["id"]

        # 楽曲作成
        song_res = client.post("/songs/", json={"title": "Test Song"}).json()
        
        # セットリストエントリを元公演に追加
        client.put(
            f"/performances/{source_id}/setlist",
            json={"entries": [
                {
                    "song_id": song_res["id"],
                    "order_index": 1
                }
            ]}
        )

        # コピー処理
        copy_res = client.post(
            "/performances/bulk-copy-setlist",
            json={
                "source_performance_id": source_id,
                "target_performance_ids": [target_id]
            }
        )
        assert copy_res.status_code == 200

        # 検証
        updated_target = client.get(f"/performances/{target_id}").json()
        assert len(updated_target["setlist_entries"]) == 1
        assert updated_target["setlist_entries"][0]["song_id"] == song_res["id"]

    def test_update_setlist_entries_and_encore(self, client):
        """セットリストの楽曲修正と、アンコール情報などの反映ができること"""
        # 公演作成
        perf = client.post("/performances/", json={
            "name": "Setlist Update Live",
            "date": "2023-01-01",
            "performance_type": "Live"
        }).json()
        perf_id = perf["id"]

        # 楽曲作成
        song_a = client.post("/songs/", json={"title": "Wrong Song"}).json()
        song_b = client.post("/songs/", json={"title": "Correct Song"}).json()

        # 間違った曲で登録
        client.put(
            f"/performances/{perf_id}/setlist",
            json={"entries": [
                {
                    "song_id": song_a["id"],
                    "order_index": 1
                }
            ]}
        )

        # 修正およびアンコール情報の追加
        update_res = client.put(
            f"/performances/{perf_id}/setlist",
            json={"entries": [
                {
                    "song_id": song_b["id"],
                    "order_index": 1,
                    "notes": "Encore 1"
                }
            ]}
        )
        assert update_res.status_code == 200

        # 検証
        updated_perf = client.get(f"/performances/{perf_id}").json()
        entries = updated_perf["setlist_entries"]
        assert len(entries) == 1
        assert entries[0]["song_id"] == song_b["id"]
        assert entries[0]["notes"] == "Encore 1"
