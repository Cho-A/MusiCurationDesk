import sys
import os

# プロジェクトルートにパスを通す
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.services.spotify_client import SpotifyClient

def main():
    client = SpotifyClient()
    
    print("--- Testing Artist Search: UNISON SQUARE GARDEN ---")
    artists = client.search_artists("UNISON SQUARE GARDEN", limit=1)
    for a in artists:
        print(f"Name: {a['name']}, ID: {a['id']}")
    
    print("\n--- Testing Track Search: オリオンをなぞる ---")
    tracks = client.search_tracks("オリオンをなぞる artist:UNISON SQUARE GARDEN", limit=1)
    for t in tracks:
        print(f"Title: {t['name']}, ID: {t['id']}, Artist: {t['artists'][0]['name']}")

if __name__ == "__main__":
    main()
