import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, Loader } from 'lucide-react';

interface ArtistLink {
  artist_id: number;
  artist_name: string;
}

interface SongData {
  id: number;
  title: string;
  work_id?: number;
  artist_links?: ArtistLink[];
}

interface AttachWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: SongData;
  onAttach: (targetWorkId: number) => void;
}

const AttachWorkModal: React.FC<AttachWorkModalProps> = ({ isOpen, onClose, currentSong, onAttach }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初期値のセット
  useEffect(() => {
    if (isOpen) {
      // 最初の括弧などの余計な文字を省いたベースタイトルで検索するとヒットしやすい
      const baseTitle = currentSong.title.split(/[\(\[-]/)[0].trim();
      setSearchQuery(baseTitle || currentSong.title);
    }
  }, [isOpen, currentSong]);

  // 検索実行
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // 現在の曲の主要アーティストIDを取得 (存在すれば)
        const mainArtistId = currentSong.artist_links && currentSong.artist_links.length > 0 
          ? currentSong.artist_links[0].artist_id 
          : null;

        // まずはアーティストID＋タイトルで検索（サジェスト）
        // もしユーザーが明示的に検索ワードを変えた場合（初期値と違う）は、アーティスト縛りを外す
        const baseTitle = currentSong.title.split(/[\(\[-]/)[0].trim() || currentSong.title;
        const isInitialSuggest = searchQuery === baseTitle;
        let url = `http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(searchQuery)}&limit=50`;
        
        if (isInitialSuggest && mainArtistId) {
          url += `&artist_id_filter=${mainArtistId}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data: SongData[] = await res.json();
          
          // 名寄せ処理 (同じ work_id のものは1つにまとめる。work_idが無いものはidで)
          const uniqueWorks = new Map<number, SongData>();
          data.forEach(song => {
            if (song.id === currentSong.id) return;
            const key = song.work_id ? song.work_id : -song.id;
            
            // 既に同じ work_id に属している場合はスキップ
            if (song.work_id && song.work_id === currentSong.work_id) return;

            if (!uniqueWorks.has(key)) {
              uniqueWorks.set(key, song);
            }
          });

          setResults(Array.from(uniqueWorks.values()));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // デバウンス処理
    const timerId = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => clearTimeout(timerId);
  }, [isOpen, searchQuery, currentSong]);

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
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>作品を統合する (Merge Work)</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              統合先の作品（曲名）を検索して選択してください
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
              placeholder="曲名を検索..."
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
                      {song.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.artist_links && song.artist_links.length > 0 ? song.artist_links.map(a => a.artist_name).join(', ') : 'Unknown Artist'}
                      <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
                      Work ID: {song.work_id || '(未統合)'}
                    </div>
                  </div>
                  <button 
                    onClick={() => onAttach(song.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                      padding: '8px 16px', backgroundColor: 'var(--spotify-color)', color: '#000',
                      border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer',
                      fontSize: '0.9rem', transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <LinkIcon size={14} />
                    この作品に統合
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

export default AttachWorkModal;
