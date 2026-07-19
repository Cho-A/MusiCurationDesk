from __future__ import annotations
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# 既存のlivefansディレクトリ内のスクリプトで使われていた認証情報を使用
SPOTIPY_CLIENT_ID = "ad1fc2f814234729a710e8dacd9729d7"
SPOTIPY_CLIENT_SECRET = "ab7ce1d093e14322a4e67c7a2909a81b"

class SpotifyClient:
    def __init__(self):
        auth_manager = SpotifyClientCredentials(
            client_id=SPOTIPY_CLIENT_ID,
            client_secret=SPOTIPY_CLIENT_SECRET
        )
        self.sp = spotipy.Spotify(auth_manager=auth_manager)
    
    def search_artists(self, query: str, limit: int = 10):
        """Spotifyからアーティストを検索する"""
        results = self.sp.search(q=query, type='artist', limit=limit)
        return results['artists']['items']

    def search_tracks(self, query: str, limit: int = 10):
        """Spotifyから楽曲を検索する"""
        results = self.sp.search(q=query, type='track', limit=limit)
        return results['tracks']['items']

    def get_track(self, track_id: str):
        """特定のトラックIDの情報を取得する"""
        return self.sp.track(track_id)

    def get_artist(self, artist_id: str):
        """特定のアーティストIDの情報を取得する"""
        return self.sp.artist(artist_id)
