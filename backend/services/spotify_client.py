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
        self.sp = spotipy.Spotify(auth_manager=auth_manager, language='ja')
    
    def search_artists(self, query: str, limit: int = 10):
        """Spotifyからアーティストを検索する"""
        results = self.sp.search(q=query, type='artist', limit=limit, market='JP')
        return results['artists']['items']

    def search_tracks(self, query: str, limit: int = 10):
        """Spotifyから楽曲を検索する"""
        results = self.sp.search(q=query, type='track', limit=limit, market='JP')
        return results['tracks']['items']

    def get_track(self, track_id: str):
        """特定のトラックIDの情報を取得する"""
        return self.sp.track(track_id, market='JP')

    def get_artist(self, artist_id: str):
        """特定のアーティストIDの情報を取得する"""
        return self.sp.artist(artist_id)

    def get_artist_albums(self, artist_id: str, limit: int = 50):
        """特定のアーティストのアルバム一覧を取得する"""
        results = self.sp.artist_albums(artist_id, album_type='album,single', limit=limit, market='JP')
        return results['items']

    def get_album_tracks(self, album_id: str, limit: int = 50):
        """特定のアルバムのトラック一覧を取得する"""
        results = self.sp.album_tracks(album_id, limit=limit, market='JP')
        return results['items']

    def get_playlist_tracks(self, playlist_id: str, limit: int = 100):
        """特定のプレイリストのトラック一覧を取得する"""
        results = self.sp.playlist_tracks(playlist_id, limit=limit, market='JP')
        # プレイリストの items は { added_at, added_by, is_local, track: { ... } } という構造
        return [item['track'] for item in results['items'] if item.get('track')]

