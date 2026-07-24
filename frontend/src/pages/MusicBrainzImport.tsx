import React, { useState } from 'react';
import { Search, Disc, PlusCircle, CheckSquare, Square, DownloadCloud } from 'lucide-react';
import CDImportBuilderModal from '../components/CDImportBuilderModal';

interface MBRelease {
  id: string;
  title: string;
  date: string;
  country: string;
  barcode: string;
  artist: string;
}

interface MBTrack {
  position: number;
  number: string;
  title: string;
  length: number;
}

interface MBMedia {
  position: number;
  title?: string;
  format: string;
  track_count: number;
  tracks: MBTrack[];
}

interface MBReleaseDetail {
  id: string;
  title: string;
  date: string;
  barcode: string;
  media: MBMedia[];
}

const MusicBrainzImport = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MBRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<MBReleaseDetail | null>(null);
  
  // バルクインポート用ステート
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{status: string, progress: number, message: string} | null>(null);

  // モーダルステート
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/musicbrainz/search?q=${encodeURIComponent(query)}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || '検索に失敗しました');
      }
      
      setResults(Array.isArray(data) ? data : []);
      setSelectedRelease(null);
      setSelectedForBulk(new Set());
    } catch (err: any) {
      console.error(err);
      alert(`エラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectForDetail = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/musicbrainz/releases/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || '詳細取得に失敗しました');
      }
      
      setSelectedRelease(data);
    } catch (err: any) {
      console.error(err);
      alert(`詳細取得に失敗しました: ${err.message}`);
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

  const toggleBulkSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedForBulk);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForBulk(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedForBulk.size === results.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(results.map(r => r.id)));
    }
  };

  const handleBulkImport = async () => {
    if (selectedForBulk.size === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/musicbrainz/import/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ release_ids: Array.from(selectedForBulk) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'バルクインポート開始に失敗しました');
      
      setBulkJobId(data.job_id);
      pollBulkProgress(data.job_id);
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
      setLoading(false);
    }
  };

  const pollBulkProgress = async (jobId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/musicbrainz/import/bulk/progress/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch job progress');
      const data = await res.json();
      setBulkProgress(data);
      
      if (data.status === 'running' || data.status === 'queued') {
        setTimeout(() => pollBulkProgress(jobId), 1000);
      } else {
        setLoading(false);
        if (data.status === 'completed') {
          alert('すべてのインポートが完了しました');
        } else if (data.status === 'failed') {
          alert(`インポート中にエラーが発生しました: ${data.message || '不明なエラー'}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
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
            placeholder="アーティスト名やアルバム名を入力... (例: ZAZEN BOYS)" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
            backgroundColor: 'var(--spotify-color)', color: 'black', border: 'none', 
            borderRadius: '8px', padding: '0 24px', fontWeight: 'bold', cursor: 'pointer',
            opacity: (loading || !query) ? 0.5 : 1
          }}
        >
          {loading && !bulkJobId ? '検索中...' : '検索'}
        </button>
      </form>

      {/* バルクインポートプログレス */}
      {bulkProgress && (
        <div style={{ marginBottom: '32px', padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DownloadCloud size={20} color="#1DB954" />
            一括インポート進捗
          </h3>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ 
              width: `${bulkProgress.progress}%`, height: '100%', 
              background: bulkProgress.status === 'failed' ? '#ff6b6b' : '#1DB954',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span>{bulkProgress.message}</span>
            <span>{bulkProgress.progress}%</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* 検索結果 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>検索結果</h2>
            {results.length > 0 && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={toggleSelectAll}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {selectedForBulk.size === results.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  すべて選択
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={selectedForBulk.size === 0 || loading}
                  style={{ 
                    background: selectedForBulk.size > 0 ? '#1DB954' : 'var(--bg-secondary)', 
                    color: selectedForBulk.size > 0 ? '#fff' : 'var(--text-tertiary)', 
                    border: 'none', borderRadius: '16px', padding: '6px 16px', cursor: selectedForBulk.size > 0 ? 'pointer' : 'not-allowed', 
                    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                  }}
                >
                  <DownloadCloud size={16} />
                  一括インポート ({selectedForBulk.size})
                </button>
              </div>
            )}
          </div>
          
          {results.length === 0 && !loading && (
            <div style={{ color: 'var(--text-tertiary)', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              検索結果がありません
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map(r => (
              <div 
                key={r.id} 
                onClick={() => handleSelectForDetail(r.id)}
                style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  background: selectedRelease?.id === r.id ? 'rgba(29,185,84,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedRelease?.id === r.id ? '#1DB954' : 'rgba(255,255,255,0.1)'}`,
                  padding: '16px', borderRadius: '8px', cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div 
                  onClick={(e) => toggleBulkSelection(r.id, e)}
                  style={{ marginTop: '2px', color: selectedForBulk.has(r.id) ? '#1DB954' : 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                  {selectedForBulk.has(r.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
                
                <div style={{ flex: 1 }}>
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
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '12px', color: 'var(--spotify-color)' }}>
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

              <div style={{ marginTop: '24px', padding: '24px', background: 'var(--spotify-bg)', border: '1px solid rgba(29,185,84,0.3)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--spotify-color)' }}>このCDを手動インポート</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    既存の楽曲（Song）と手動で紐付ける場合はこちらを使用します。
                  </p>
                </div>
                <button 
                  onClick={() => setIsBuilderOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--spotify-color)', color: '#000', border: 'none', borderRadius: '24px',
                    padding: '12px 32px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29,185,84,0.3)'
                  }}
                >
                  <PlusCircle size={20} />
                  手動アルバムビルダーを起動
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <CDImportBuilderModal 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        release={selectedRelease}
      />
    </div>
  );
};

export default MusicBrainzImport;
