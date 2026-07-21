import React, { useState, useEffect } from 'react';
import { X, Search, Check, Loader } from 'lucide-react';

interface ArtistLink {
  artist_id: number;
  artist_name: string;
}

interface SongData {
  id: number;
  title: string;
  version_name?: string;
  work_id?: number;
  is_video?: boolean;
  artist_links?: ArtistLink[];
}

interface MergeSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: SongData;
  otherVersions: SongData[];
  onMerge: (targetSongId: number) => void;
}

const MergeSongModal: React.FC<MergeSongModalProps> = ({ isOpen, onClose, currentSong, otherVersions, onMerge }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初期値は空にして、サジェスト（otherVersions）を表示
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // 検索実行
  useEffect(() => {
    if (!isOpen) return;

    if (!searchQuery.trim()) {
      setResults(otherVersions);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const url = `http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(searchQuery)}&limit=50`;
        const res = await fetch(url);
        if (res.ok) {
          const data: SongData[] = await res.json();
          // 自分自身を除外
          setResults(data.filter(s => s.id !== currentSong.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const timerId = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => clearTimeout(timerId);
  }, [isOpen, searchQuery, currentSong, otherVersions]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>バージョンを統合する (Merge Song)</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              統合先のバージョンを選択してください。実体が全く同じ音源や映像であるにもかかわらず、別々に登録されてしまっている場合に使用します。
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#ff6b6b' }}>
              ※現在のバージョンは削除され、クレジットや収録アルバムは統合先に引き継がれます（元に戻せません）。
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="曲名を検索して他のバージョンを探す..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px 14px 48px',
                backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <Loader size={24} className="spin" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
              検索中...
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map(song => (
                <div key={song.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px'
                }}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title} {song.version_name && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>- {song.version_name}</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.artist_links && song.artist_links.length > 0 ? song.artist_links.map(a => a.artist_name).join(', ') : 'Unknown Artist'}
                      <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
                      Song ID: {song.id}
                      {song.is_video && <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'rgba(255,165,0,0.1)', color: '#ffa500', borderRadius: '4px', fontSize: '0.75rem' }}>映像</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => onMerge(song.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                      padding: '8px 16px', backgroundColor: '#ffa500', color: '#000',
                      border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer',
                      fontSize: '0.9rem', transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Check size={14} />
                    このバージョンに統合
                  </button>
                </div>
              ))}
            </div>
          ) : (
            searchQuery.trim() !== '' && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                候補が見つかりませんでした。別のキーワードでお試しください。
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MergeSongModal;
