from __future__ import annotations

import time
from typing import Any

import requests

MB_API_BASE = "https://musicbrainz.org/ws/2"
USER_AGENT = "MusiCurationDesk/1.0 ( https://github.com/takanoryo/MusiCurationDesk )"


def search_releases(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    MusicBrainz からアルバム(Release)を検索する
    """
    url = f"{MB_API_BASE}/release"
    params = {"query": query, "fmt": "json", "limit": limit}
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        # 1度だけリトライ
        time.sleep(1.5)
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()

    data = response.json()

    releases = []
    for r in data.get("releases", []):
        releases.append(
            {
                "id": r.get("id"),
                "title": r.get("title"),
                "date": r.get("date"),
                "country": r.get("country"),
                "barcode": r.get("barcode"),
                "artist": r.get("artist-credit", [{"name": "Unknown"}])[0].get("name", "Unknown"),
            }
        )
    return releases


def get_release_details(release_id: str) -> dict[str, Any]:
    """
    ReleaseのIDから、ディスク(media)とトラックリストを取得する
    """
    url = f"{MB_API_BASE}/release/{release_id}"
    params = {"inc": "recordings+artist-credits", "fmt": "json"}
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        # 1度だけリトライ
        time.sleep(1.5)
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()

    data = response.json()

    media = []
    for m in data.get("media", []):
        tracks = []
        for t in m.get("tracks", []):
            recording = t.get("recording", {})
            tracks.append(
                {
                    "position": t.get("position"),
                    "number": t.get("number"),
                    "title": recording.get("title"),
                    "length": recording.get("length"),  # milliseconds
                }
            )

        media.append(
            {
                "position": m.get("position"),
                "format": m.get("format"),
                "track_count": m.get("track-count"),
                "tracks": tracks,
            }
        )

    return {
        "id": data.get("id"),
        "title": data.get("title"),
        "date": data.get("date"),
        "barcode": data.get("barcode"),
        "artist": data.get("artist-credit", [{"name": "Unknown"}])[0].get("name", "Unknown"),
        "media": media,
    }
