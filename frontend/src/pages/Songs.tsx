import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music, Clock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';

interface AlbumMini {
  id: number;
  main_title: string;
  cover_image_url?: string;
}

interface Song {
  id: number;
  title: string;
  release_date?: string;
  jasrac_code?: string;
  is_video?: boolean;
  version_name?: string;
  primary_album?: AlbumMini | null;
}

interface SpotifyTrack {
  spotify_id: string;
  title: string;
  artist_name: string;
  album_name: string;
  image_url: string;
}

const Songs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'local' | 'spotify'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [importingTrackId, setImportingTrackId] = useState<string | null>(null);
  const [, setHasSearched] = useState(false);
  
  // 初期ロード時：最近追加された楽曲を取得
  const fetchLocalSongs = () => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/songs/recent?limit=10')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch songs');
        return res.json();
      })
      .then((data) => setSongs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLocalSongs();
  }, []);

  const handleSpotifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearchingSpotify(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/external/spotify/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Spotify search failed');
      const data = await res.json();
      setSpotifyResults(data);
    } catch (err) {
      console.error(err);
      alert('Spotifyの検索に失敗しました。');
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handleImport = async (trackId: string) => {
    setImportingTrackId(trackId);
    try {
      const res = await fetch('http://127.0.0.1:8000/external/spotify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotify_track_id: trackId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchLocalSongs(); // 成功したらローカルのリストを更新
      } else {
        alert(`エラー: ${data.detail}`);
      }
    } catch (err) {
      console.error(err);
      alert('インポートに失敗しました。');
    } finally {
      setImportingTrackId(null);
    }
  };

  // 検索処理
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (searchMode === 'local') {
        fetch(`http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => {
            setSearchResults(data);
            setHasSearched(true);
          })
          .catch(err => console.error(err));
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchMode]);

  // 楽曲カードコンポーネント
  const SongCard = ({ song }: { song: Song }) => (
    <Link to={`/songs/${song.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px',
        display: 'flex', alignItems: 'center', gap: '16px',
        transition: 'all 0.2s ease', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-color)',
        height: '100%',
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
      }}
      >
        {song.primary_album?.cover_image_url ? (
          <img src={song.primary_album.cover_image_url} alt="Cover" style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Music size={20} color={song.is_video ? "#ff4d4d" : "#1DB954"} />
          </div>
        )}
        
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
              background: song.is_video ? 'rgba(255, 77, 77, 0.15)' : 'rgba(29, 185, 84, 0.15)',
              color: song.is_video ? '#ff4d4d' : '#1DB954',
              border: `1px solid ${song.is_video ? 'rgba(255, 77, 77, 0.3)' : 'rgba(29, 185, 84, 0.3)'}`,
              flexShrink: 0, whiteSpace: 'nowrap'
            }}>
              {song.is_video ? '映像' : '音源'}
            </span>
            <div style={{ fontWeight: 600, fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {song.title}
            </div>
          </div>
          
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {song.version_name && (
              <span style={{ 
                color: 'var(--text-primary)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={song.version_name}>
                {song.version_name}
              </span>
            )}
            <span style={{ fontSize: '0.8rem' }}>
              {song.primary_album ? `収録: ${song.primary_album.main_title}` : 'アルバム未収録'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ padding: '48px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <PageHeader
        title="Songs"
        subtitle="楽曲の検索・追加・管理を行います"
      />

      {/* 検索タブ切り替え */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => setSearchMode('local')}
          style={{
            padding: '8px 16px',
            background: searchMode === 'local' ? '#1DB954' : 'var(--bg-tertiary)',
            color: searchMode === 'local' ? '#fff' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
        >
          📂 データベース内
        </button>
        <button
          onClick={() => setSearchMode('spotify')}
          style={{
            padding: '8px 16px',
            background: searchMode === 'spotify' ? '#1DB954' : 'var(--bg-tertiary)',
            color: searchMode === 'spotify' ? '#fff' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
        >
          🎧 Spotifyから追加
        </button>
      </div>

      {searchMode === 'spotify' && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Spotifyで楽曲やアーティストを検索..."
          onSubmit={handleSpotifySearch}
          disabled={isSearchingSpotify}
          buttonText={isSearchingSpotify ? '検索中...' : '検索'}
          showIcon={false}
        />
      )}

      {/* Spotify 検索結果表示 */}
      {searchMode === 'spotify' && spotifyResults.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
            Spotify 検索結果
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {spotifyResults.map((track) => (
              <div key={track.spotify_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {track.image_url ? (
                    <img src={track.image_url} alt={track.album_name} style={{ width: '64px', height: '64px', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'var(--bg-tertiary)' }} />
                  )}
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{track.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                      {track.artist_name} • {track.album_name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleImport(track.spotify_id)}
                  disabled={importingTrackId === track.spotify_id}
                  style={{
                    background: importingTrackId === track.spotify_id ? '#555' : '#1DB954',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    cursor: importingTrackId === track.spotify_id ? 'wait' : 'pointer'
                  }}
                >
                  {importingTrackId === track.spotify_id ? '追加中...' : '➕ 追加'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchMode === 'local' && (
        <>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ローカルデータベースから楽曲を検索..."
          />

          {searchQuery ? (
            <div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontWeight: 700 }}>
                "{searchQuery}" の検索結果
              </h2>
              {searchResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {searchResults.map((song: Song) => <SongCard key={song.id} song={song} />)}
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', padding: '24px' }}>見つかりませんでした。Spotifyタブから検索して追加してください。</div>
              )}
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={24} color="#1DB954" />
                最近追加された楽曲
              </h2>
              {songs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {songs.map((song: Song) => <SongCard key={song.id} song={song} />)}
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', padding: '24px' }}>まだ楽曲が登録されていません。</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Songs;