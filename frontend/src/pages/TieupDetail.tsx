import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Folder, Music, ArrowLeft, Music2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface TieupHierarchyNode {
  id: number;
  name: string;
  category?: string;
}

interface TieupDetailData {
  id: number;
  name: string;
  category?: string;
  parent_id?: number;
  children: TieupHierarchyNode[];
  parents: TieupHierarchyNode[];
}

interface Song {
  id: number;
  title: string;
  release_date?: string;
}

const TieupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tieup, setTieup] = useState<TieupDetailData | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 並行して詳細情報と楽曲一覧を取得
        const [tieupRes, songsRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/tieups/${id}`),
          fetch(`http://127.0.0.1:8000/tieups/${id}/songs`)
        ]);

        if (!tieupRes.ok) throw new Error('タイアップ情報の取得に失敗しました');
        if (!songsRes.ok) throw new Error('楽曲一覧の取得に失敗しました');

        const tieupData = await tieupRes.json();
        const songsData = await songsRes.json();

        setTieup(tieupData);
        setSongs(songsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner fullPage message="タイアップ情報を読み込んでいます..." />;
  if (error) return <div style={{ padding: '32px', color: 'red' }}>{error}</div>;
  if (!tieup) return <div style={{ padding: '32px' }}>タイアップが見つかりません。</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '1rem'
        }}
      >
        <ArrowLeft size={20} />
        戻る
      </button>

      {/* パンくずリスト */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
        {tieup.parents.map((parent) => (
          <div key={parent.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to={`/tieups/${parent.id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                {parent.name} {parent.category && <span style={{ fontSize: '0.8em', opacity: 0.7 }}>({parent.category})</span>}
              </span>
            </Link>
            <ChevronRight size={16} />
          </div>
        ))}
        {/* カレント */}
        <div style={{ padding: '4px 8px', background: 'var(--spotify-bg)', color: 'var(--spotify-color)', borderRadius: '4px', fontWeight: 'bold' }}>
          {tieup.name} {tieup.category && <span style={{ fontSize: '0.8em', opacity: 0.8 }}>({tieup.category})</span>}
        </div>
      </div>

      {/* ヘッダーエリア */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          {tieup.name}
        </h1>
        <div style={{ color: 'var(--text-secondary)' }}>
          {tieup.category || 'カテゴリなし'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* 子シリーズ一覧 (あれば表示) */}
        {tieup.children && tieup.children.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={24} />
              含まれるシリーズ
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {tieup.children.map(child => (
                <Link key={child.id} to={`/tieups/${child.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'background 0.2s ease', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <Folder size={20} color="var(--text-secondary)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{child.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--spotify-color)', marginTop: '4px' }}>
                        {child.category}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 関連楽曲一覧 */}
        <div>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Music size={24} />
            関連楽曲 ({songs.length}曲)
          </h2>
          {songs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {songs.map(song => (
                <Link key={song.id} to={`/songs/${song.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{song.title}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {song.release_date || '発売日不明'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Music2} title="関連する楽曲がありません" />
          )}
        </div>

      </div>
    </div>
  );
};

export default TieupDetail;
