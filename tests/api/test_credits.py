def test_apply_to_artist_custom_roles(client):
    """
    特定アーティストの楽曲に対するクレジット一括適用（カスタム役割・対象楽曲フィルタリングを含む）のテスト
    """
    # 1. アーティスト作成
    res = client.post("/artists/", json={"name": "TestArtist_BulkApply"})
    assert res.status_code == 200
    artist_id = res.json()["id"]

    # 2. 楽曲を2曲作成し、メインアーティストとして割り当てる
    song1_res = client.post("/songs/", json={"title": "Song 1"})
    assert song1_res.status_code == 200
    song1_id = song1_res.json()["id"]

    song2_res = client.post("/songs/", json={"title": "Song 2"})
    assert song2_res.status_code == 200
    song2_id = song2_res.json()["id"]

    client.put(f"/songs/{song1_id}/main_artist", json={"artist_id": artist_id})
    client.put(f"/songs/{song2_id}/main_artist", json={"artist_id": artist_id})

    # 3. apply-to-artist エンドポイントを叩く
    # - Song 1 のみをターゲットとする
    # - カスタムロール 'Guitar' に 'Guitarist Y' を追加する
    payload = {
        "artist_id": artist_id,
        "target_song_ids": [song1_id],
        "lyricists": ["Lyricist X"],
        "custom_roles": [
            {
                "role_category": "Guitar",
                "artists": ["Guitarist Y"],
                "overwrite": True
            }
        ],
        "overwrite_lyricists": True,
        "overwrite_composers": True,
        "overwrite_arrangers": True
    }

    res = client.post("/credits/apply-to-artist", json=payload)
    assert res.status_code == 200

    # 4. 検証：Song 1 には 'Guitar' と 'Lyricist' が追加されているか
    song1_detail = client.get(f"/songs/{song1_id}").json()
    
    guitar_artists = [link.get("artist", {}).get("name") for link in song1_detail.get("artist_links", []) if link.get("role_category") == "Guitar"]
    assert "Guitarist Y" in guitar_artists

    lyric_artists = [link.get("artist", {}).get("name") for link in song1_detail.get("work", {}).get("artist_links", []) if link.get("role_category") == "Lyricist"]
    assert "Lyricist X" in lyric_artists

    # 5. 検証：Song 2 には追加されていないか
    song2_detail = client.get(f"/songs/{song2_id}").json()
    guitar_artists_2 = [link.get("artist", {}).get("name") for link in song2_detail.get("artist_links", []) if link.get("role_category") == "Guitar"]
    assert len(guitar_artists_2) == 0

    lyric_artists_2 = [link.get("artist", {}).get("name") for link in song2_detail.get("work", {}).get("artist_links", []) if link.get("role_category") == "Lyricist"]
    assert len(lyric_artists_2) == 0
