import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Music, PlusCircle, Headphones, Clock } from 'lucide-react';

interface Song {
  id: number;
  title: string;
  release_date?: string;
}

const Songs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 初期ロード時：最近追加された楽曲を取得
  useEffect(() => {
    fetch('http://127.0.0.1:8000/songs/recent?limit=6')
      .then(res => res.json())
      .then(data => setRecentSongs(data))
      .catch(err => console.error(err));
  }, []);

  // 検索処理
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      fetch(`http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setHasSearched(true);
        })
        .catch(err => console.error(err))
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 楽曲カードコンポーネント
  const SongCard = ({ song }: { song: Song }) => (
    <Link to={`/songs/${song.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        transition: 'all 0.2s ease', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          width: '56px', height: '56px', background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
          borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          <Music size={24} color="#1DB954" />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {song.title}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {song.release_date || '発売日不明'}
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ padding: '48px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 検索ヘッダー領域 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '64px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '24px', letterSpacing: '-0.02em', textAlign: 'center' }}>
          楽曲情報を調べる
        </h1>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <Search size={24} color="var(--text-secondary)" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="楽曲名で検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '20px 20px 20px 60px',
              fontSize: '1.2rem', borderRadius: '32px',
              border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)', outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1DB954'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
      </div>

      {/* 検索中のローディング */}
      {isSearching && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '48px 0' }}>
          検索中...
        </div>
      )}

      {/* 検索結果 */}
      {hasSearched && !isSearching && (
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontWeight: 700 }}>
            "{searchQuery}" の検索結果
          </h2>
          
          {searchResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {searchResults.map(song => <SongCard key={song.id} song={song} />)}
            </div>
          ) : (
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)',
              borderRadius: '16px', padding: '48px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                データベースに見つかりませんでした。
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* 手動追加ボタン */}
                <button style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
                  padding: '16px 32px', borderRadius: '32px', fontSize: '1rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <PlusCircle size={20} />
                  楽曲を手動で追加
                </button>

                {/* Spotifyモックボタン */}
                <button style={{
                  background: '#1DB954', color: 'black', border: 'none',
                  padding: '16px 32px', borderRadius: '32px', fontSize: '1rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1ed760'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1DB954'}
                >
                  <Headphones size={20} />
                  Spotifyから検索して追加
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 初期状態: 最近追加された楽曲 */}
      {!hasSearched && (
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={24} color="#1DB954" />
            最近追加された楽曲
          </h2>
          
          {recentSongs.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {recentSongs.map(song => <SongCard key={song.id} song={song} />)}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', padding: '24px' }}>
              まだ楽曲が登録されていません
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Songs;