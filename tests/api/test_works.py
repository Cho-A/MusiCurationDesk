import pytest
from fastapi.testclient import TestClient

def test_update_work_title(client: TestClient):
    """
    Workのタイトルを更新できるかどうかのテスト
    """
    # 1. 曲を作成し、それに紐づくWorkを作成する
    song_res = client.post("/songs/", json={"title": "Test Song For Work"})
    song_id = song_res.json()["id"]

    song2_res = client.post("/songs/", json={"title": "Test Song 2"})
    song2_id = song2_res.json()["id"]

    # attach_to_songでWorkを作成・統合する
    client.post(f"/songs/{song_id}/attach_to_song?target_song_id={song2_id}")

    # Work IDを取得
    song_detail = client.get(f"/songs/{song_id}").json()
    work_id = song_detail["work_id"]
    assert work_id is not None

    # 2. PUT /works/{work_id} でタイトルを更新する
    update_payload = {"title": "Updated Work Title"}
    update_res = client.put(f"/works/{work_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Work Title"

    # 3. GET /works/{work_id} または該当の曲を取得し、タイトルが反映されているか確認する
    song1_updated = client.get(f"/songs/{song_id}").json()
    assert song1_updated["work"]["title"] == "Updated Work Title"

    song2_updated = client.get(f"/songs/{song2_id}").json()
    assert song2_updated["work"]["title"] == "Updated Work Title"
