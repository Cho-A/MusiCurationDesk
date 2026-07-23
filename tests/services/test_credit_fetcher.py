from unittest.mock import MagicMock
from backend.services.credit_fetcher import MusicImporter

def test_progress_monotonically_increases():
    # Setup mock DB
    db_mock = MagicMock()
    # mock AlbumTrack search to return None so it proceeds
    db_mock.query.return_value.filter.return_value.first.return_value = None
    
    importer = MusicImporter()
    
    # Mock Spotify API
    importer.spotify = MagicMock()
    importer.spotify.get_artist.return_value = {"id": "art_1", "name": "Artist 1"}
    importer.spotify.get_artist_albums.return_value = [
        {"id": "alb_1", "name": "Album 1", "release_date": "2023", "artists": [{"id": "art_1", "name": "Artist 1"}], "images": []},
        {"id": "alb_2", "name": "Album 2", "release_date": "2024", "artists": [{"id": "art_1", "name": "Artist 1"}], "images": []}
    ]
    
    def mock_get_tracks(album_id, limit=50):
        return [
            {"id": f"{album_id}_t1", "name": "T1", "track_number": 1},
            {"id": f"{album_id}_t2", "name": "T2", "track_number": 2}
        ]
    importer.spotify.get_album_tracks.side_effect = mock_get_tracks
    
    # Mock MusicBrainz API
    importer.mb = MagicMock()
    
    # Mock internal methods to avoid real DB insertions and complex logic
    importer._get_or_create_artist = MagicMock(return_value=1)
    
    # Mock import_track_from_spotify to just return a dummy object with an id
    mock_song = MagicMock()
    mock_song.id = 1
    importer.import_track_from_spotify = MagicMock(return_value=mock_song)
    
    progress_values = []
    
    def progress_callback(progress, message):
        progress_values.append(progress)
        
    importer.import_artist_bulk("art_1", db_mock, progress_callback)
    
    # Verify that the progress percentage never decreases
    for i in range(1, len(progress_values)):
        assert progress_values[i] >= progress_values[i-1], f"Progress went backwards: {progress_values[i-1]} -> {progress_values[i]} at step {i}"
