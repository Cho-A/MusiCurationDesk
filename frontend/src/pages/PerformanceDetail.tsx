import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Artist {
  id: number;
  name: string;
}

interface Venue {
  id: number;
  name: string;
  prefecture?: string;
}

interface SetlistEntry {
  id: number;
  song_id: number;
  order_index: number;
  notes?: string;
  song: {
    id: number;
    title: string;
  };
}

interface RosterEntry {
  id: number;
  artist: Artist;
  role: string;
  context?: string;
}

interface PerformanceDetail {
  id: number;
  name: string;
  date: string;
  event_type: string;
  performance_type: string;
  main_artist: Artist;
  venue?: Venue;
  setlist_entries: SetlistEntry[];
  roster_entries: RosterEntry[];
}

const PerformanceDetail = () => {
  const { id } = useParams();
  const [performance, setPerformance] = useState<PerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'setlist' | 'roster'>('setlist');

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/performances/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        // ソート順を保証
        if (data.setlist_entries) {
          data.setlist_entries.sort((a: any, b: any) => a.order_index - b.order_index);
        }
        setPerformance(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '64px', textAlign: 'center', fontSize: '1.2rem', color: '#888' }}>Loading Event...</div>;
  if (!performance) return <div style={{ padding: '64px', textAlign: 'center', fontSize: '1.2rem', color: '#ff4444' }}>Event not found.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>
      
      {/* ライブヘッダー領域 */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,25,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <span style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginRight: '8px'
          }}>
            {performance.event_type}
          </span>
          <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{performance.date}</span>
        </div>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          {performance.name}
        </h1>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '8px' }}>
          {performance.main_artist && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {performance.main_artist.name[0]}
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{performance.main_artist.name}</span>
            </div>
          )}
          {performance.venue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' }}>
              <span>📍</span>
              <span style={{ fontSize: '1.1rem' }}>
                {performance.venue.name} {performance.venue.prefecture && `(${performance.venue.prefecture})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* タブ切り替えUI */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('setlist')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 24px',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: activeTab === 'setlist' ? '#fff' : '#666',
            borderBottom: activeTab === 'setlist' ? '3px solid #4CAF50' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎵 セットリスト
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 24px',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: activeTab === 'roster' ? '#fff' : '#666',
            borderBottom: activeTab === 'roster' ? '3px solid #4CAF50' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎸 参加メンバー
        </button>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'setlist' && (
          <div>
            {performance.setlist_entries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                セットリストはまだ登録されていません。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {performance.setlist_entries.map((entry, index) => {
                  const isEncore = entry.notes?.toLowerCase().includes('encore') || entry.notes?.includes('アンコール');
                  const prevIsEncore = index > 0 && (performance.setlist_entries[index - 1].notes?.toLowerCase().includes('encore') || performance.setlist_entries[index - 1].notes?.includes('アンコール'));
                  
                  return (
                    <React.Fragment key={entry.id}>
                      {isEncore && !prevIsEncore && (
                        <div style={{ margin: '16px 0 8px 0', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '8px', color: '#aaa', fontWeight: 600, letterSpacing: '0.05em' }}>
                          ENCORE
                        </div>
                      )}
                      <Link to={`/songs/${entry.song.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '16px 20px', 
                          background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '8px',
                          transition: 'background 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                          <div style={{ width: '40px', color: '#666', fontWeight: 700 }}>
                            {entry.order_index}
                          </div>
                          <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: 500 }}>
                            {entry.song.title}
                          </div>
                          {entry.notes && !isEncore && (
                            <div style={{ fontSize: '0.85rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      </Link>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'roster' && (
          <div>
            {performance.roster_entries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                参加メンバー情報はありません。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {performance.roster_entries.map((entry) => (
                  <div key={entry.id} style={{ 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {entry.role}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                      {entry.artist.name}
                    </span>
                    {entry.context && (
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>
                        {entry.context}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PerformanceDetail;
