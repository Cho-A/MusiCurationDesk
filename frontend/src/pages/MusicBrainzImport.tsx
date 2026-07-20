import React, { useState } from 'react';
import { Search, Disc, Download, AlertCircle } from 'lucide-react';

interface MBRelease {
  id: string;
  title: string;
  date: string;
  country: string;
  barcode: string;
  artist: string;
}

interface MBReleaseDetail {
  id: string;
  title: string;
  date: string;
  barcode: string;
  media: {
    position: number;
    format: string;
    track_count: number;
    tracks: {
      position: number;
      number: string;
      title: string;
      length: number;
    }[];
  }[];
}

const MusicBrainzImport = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MBRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<MBReleaseDetail | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/musicbrainz/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setSelectedRelease(null);
    } catch (err) {
      console.error(err);
      alert('検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/musicbrainz/releases/${id}`);
      const data = await res.json();
      setSelectedRelease(data);
    } catch (err) {
      console.error(err);
      alert('詳細取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (!ms) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Download size={32} color="#1DB954" />
        MusicBrainz インポート (β)
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        MusicBrainzから物理CDやDVDの情報を検索し、MusiCurationDeskにインポートします。
      </p>

      {/* 検索バー */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', flex: 1,
          backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Search size={20} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="アルバム名、アーティスト名、またはバーコード (JAN) を入力..."
            style={{ 
              background: 'transparent', border: 'none', color: 'white', 
              fontSize: '1rem', width: '100%', outline: 'none'
            }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !query}
          style={{ 
            backgroundColor: '#1DB954', color: 'black', border: 'none', 
            borderRadius: '8px', padding: '0 24px', fontWeight: 'bold', cursor: 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* 検索結果 */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>検索結果</h2>
          {results.length === 0 && !loading && (
            <div style={{ color: 'var(--text-tertiary)', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              検索結果がありません
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map(r => (
              <div 
                key={r.id} 
                onClick={() => handleSelect(r.id)}
                style={{ 
                  background: selectedRelease?.id === r.id ? 'rgba(29,185,84,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedRelease?.id === r.id ? '#1DB954' : 'rgba(255,255,255,0.1)'}`,
                  padding: '16px', borderRadius: '8px', cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{r.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {r.artist} • {r.date} {r.country && `(${r.country})`}
                </div>
                {r.barcode && (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '8px' }}>
                    JAN/Barcode: {r.barcode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 選択したリリースの詳細 */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>トラックリスト詳細</h2>
          {!selectedRelease ? (
            <div style={{ color: 'var(--text-tertiary)', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              左のリストからリリースを選択してください
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '24px' }}>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{selectedRelease.title}</h3>
                <div style={{ color: 'var(--text-secondary)' }}>リリース日: {selectedRelease.date}</div>
              </div>

              {selectedRelease.media.map(m => (
                <div key={m.position} style={{ marginBottom: '24px' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '12px', color: '#1DB954' }}>
                    <Disc size={20} />
                    Disc {m.position} ({m.format}) - {m.track_count} Tracks
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {m.tracks.map(t => (
                      <div key={t.number} style={{ display: 'flex', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '40px', color: 'var(--text-tertiary)' }}>{t.number}</div>
                        <div style={{ flex: 1 }}>{t.title}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{formatTime(t.length)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.3)', borderRadius: '8px', display: 'flex', gap: '12px' }}>
                <AlertCircle size={24} color="#FFB800" />
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                  このフェーズ (Phase 20) では MusicBrainz からの検索とトラックリスト表示までの実装となります。実際のMusiCurationDeskデータベースへのインポート（アルバムおよび楽曲の生成・紐付け）は、次のフェーズで実装されます。
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicBrainzImport;
