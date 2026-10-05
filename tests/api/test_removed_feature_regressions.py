"""
ライブ・グッズ機能削除 (5a91a22) の後に残っていた「削除済みモデル/属性への参照」による
クラッシュの再発防止テスト。

- 統合処理は必ず本物のエンドポイント経由で実行する（ロジックのコピーでテストしない）
- 静的チェックで、存在しない models.Xxx / models.Xxx.yyy への参照を検出する
"""

import re
from pathlib import Path

from backend import dependencies, models
from backend.main import app

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"


# ---------------------------------------------------------------------------
# 1. 楽曲統合 / エディション統合（実際に落ちていた箇所）
# ---------------------------------------------------------------------------
def _make_album_with_track(db_session, title, song_title, group_id=None):
    album = models.Album(main_title=title, album_group_id=group_id)
    db_session.add(album)
    db_session.flush()
    song = models.Song(title=song_title)
    db_session.add(song)
    db_session.flush()
    db_session.add(models.AlbumTrack(album_id=album.id, song_id=song.id, disc_number=1, track_number=1))
    db_session.flush()
    return album, song


def test_merge_song_endpoint(client, db_session):
    """POST /songs/{id}/merge が実際の perform_song_merge を通って成功する"""
    album_a, source = _make_album_with_track(db_session, "Album A", "Same Song")
    _, target = _make_album_with_track(db_session, "Album B", "Same Song")
    db_session.commit()
    source_id, target_id = source.id, target.id

    res = client.post(f"/songs/{source_id}/merge?target_song_id={target_id}")
    assert res.status_code == 200, res.text

    db_session.expire_all()
    assert db_session.query(models.Song).filter(models.Song.id == source_id).first() is None
    track = db_session.query(models.AlbumTrack).filter(models.AlbumTrack.album_id == album_a.id).one()
    assert track.song_id == target_id


def test_merge_editions_endpoint(client, db_session):
    """POST /album-groups/{id}/merge-editions（ユーザーが実行して落ちた操作）が成功する"""
    group = models.AlbumGroup(title="Group")
    db_session.add(group)
    db_session.flush()
    target_album, target_song = _make_album_with_track(db_session, "Regular", "Track One", group.id)
    source_album, source_song = _make_album_with_track(db_session, "Limited", "Track One", group.id)
    db_session.commit()
    source_song_id = source_song.id

    res = client.post(
        f"/album-groups/{group.id}/merge-editions",
        json={"target_album_id": target_album.id, "source_album_ids": [source_album.id]},
    )
    assert res.status_code == 200, res.text
    assert res.json()["merged_count"] == 1

    db_session.expire_all()
    assert db_session.query(models.Song).filter(models.Song.id == source_song_id).first() is None


# ---------------------------------------------------------------------------
# 2. 同じ原因で落ちる状態だった他のエンドポイント
# ---------------------------------------------------------------------------
def _login_as(db_session):
    user = models.User(username="regress_user", email="regress@example.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[dependencies.get_current_user] = lambda: user
    return user


def test_dashboard_recent_me(client, db_session):
    """ログイン時のダッシュボード（/dashboard/recent/me）が 500 にならない"""
    user = _login_as(db_session)
    artist = models.Artist(name="Owned Artist")
    db_session.add(artist)
    db_session.flush()
    album = models.Album(main_title="Owned Album", artist_id=artist.id)
    db_session.add(album)
    db_session.flush()
    db_session.add(models.UserPossession(user_id=user.id, entity_type="album", entity_id=album.id))
    db_session.commit()

    res = client.get("/dashboard/recent/me")
    assert res.status_code == 200, res.text
    assert [a["id"] for a in res.json()["recent_albums"]] == [album.id]


def test_possession_merchandise_is_rejected(client, db_session):
    """グッズ機能は削除済みなので merchandise は 400（500 ではなく）"""
    _login_as(db_session)
    res = client.post("/users/possessions", json={"entity_type": "merchandise", "entity_id": 1})
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# 3. 静的チェック：存在しないモデル/属性への参照を検出
# ---------------------------------------------------------------------------
_MODEL_REF = re.compile(r"\bmodels\.([A-Z]\w*)(?:\.([a-z_]\w*))?")


def test_no_references_to_removed_models_or_attributes():
    """backend 内の models.Xxx / models.Xxx.attr がすべて実在することを確認する"""
    missing = []
    for path in BACKEND_DIR.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for cls_name, attr in _MODEL_REF.findall(line):
                cls = getattr(models, cls_name, None)
                if cls is None:
                    missing.append(f"{path.name}:{lineno} models.{cls_name}")
                elif attr and not hasattr(cls, attr):
                    missing.append(f"{path.name}:{lineno} models.{cls_name}.{attr}")
    assert not missing, "削除済みのモデル/属性への参照が残っています:\n" + "\n".join(missing)
