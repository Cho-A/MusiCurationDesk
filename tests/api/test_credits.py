from backend import models


def _setup_album_with_songs(db_session):
    """アルバム1枚 + 収録曲2曲 + アルバム外の曲1曲 を作成する"""
    album = models.Album(main_title="Bulk Apply Album")
    db_session.add(album)
    db_session.flush()

    song_a = models.Song(title="Album Song A")
    song_b = models.Song(title="Album Song B")
    song_outside = models.Song(title="Outside Song")
    db_session.add_all([song_a, song_b, song_outside])
    db_session.flush()

    db_session.add_all(
        [
            models.AlbumTrack(album_id=album.id, song_id=song_a.id, disc_number=1, track_number=1),
            models.AlbumTrack(album_id=album.id, song_id=song_b.id, disc_number=1, track_number=2),
        ]
    )
    db_session.commit()
    return album, song_a, song_b, song_outside


def _arranger_names(db_session, song_id):
    links = (
        db_session.query(models.SongArtistLink)
        .filter(models.SongArtistLink.song_id == song_id, models.SongArtistLink.role_category == "Arranger")
        .all()
    )
    return [link.artist.name for link in links]


def _work_role_names(db_session, song_id, role):
    song = db_session.query(models.Song).filter(models.Song.id == song_id).first()
    db_session.refresh(song)
    if not song.work:
        return []
    return [link.artist.name for link in song.work.artist_links if link.role_category == role]


def test_apply_credits_to_album(client, db_session):
    """album_id を指定すると、そのアルバムの収録曲すべてにクレジットが適用される"""
    album, song_a, song_b, song_outside = _setup_album_with_songs(db_session)

    res = client.post(
        "/credits/apply-to-artist",
        json={
            "album_id": album.id,
            "lyricists": ["Album Lyricist"],
            "arrangers": ["Album Arranger"],
        },
    )
    assert res.status_code == 200
    assert res.json()["updated_count"] == 2

    db_session.expire_all()
    for sid in (song_a.id, song_b.id):
        assert _arranger_names(db_session, sid) == ["Album Arranger"]
        assert _work_role_names(db_session, sid, "Lyricist") == ["Album Lyricist"]

    # アルバム外の曲には影響しない
    assert _arranger_names(db_session, song_outside.id) == []


def test_apply_credits_to_album_with_target_song_ids(client, db_session):
    """album_id + target_song_ids では、チェックした曲だけに適用される"""
    album, song_a, song_b, _ = _setup_album_with_songs(db_session)

    res = client.post(
        "/credits/apply-to-artist",
        json={
            "album_id": album.id,
            "target_song_ids": [song_a.id],
            "arrangers": ["Only A"],
            "overwrite_lyricists": False,
            "overwrite_composers": False,
        },
    )
    assert res.status_code == 200
    assert res.json()["updated_count"] == 1

    db_session.expire_all()
    assert _arranger_names(db_session, song_a.id) == ["Only A"]
    assert _arranger_names(db_session, song_b.id) == []


def test_apply_credits_requires_artist_or_album(client):
    """artist_id も album_id も無い場合は 400 を返す"""
    res = client.post("/credits/apply-to-artist", json={"lyricists": ["X"]})
    assert res.status_code == 400


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
