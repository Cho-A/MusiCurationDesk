import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';

interface Tour {
  id: number;
  name: string;
}

interface Venue {
  id: number;
  name: string;
  prefecture: string | null;
}

interface Performance {
  id: number;
  name: string;
  date: string;
  tour: Tour | null;
  venue: Venue | null;
  performance_type: string;
  main_artist: { id: number; name: string } | null;
}

const Concerts = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tours' | 'singles'>('tours');
  const [searchQuery, setSearchQuery] = useState("");

  const [showTourModal, setShowTourModal] = useState(false);
  const [newTourName, setNewTourName] = useState("");
  const [savingTour, setSavingTour] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [toursRes, perfsRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/tours/'),
        fetch('http://127.0.0.1:8000/performances/')
      ]);
      if (toursRes.ok) setTours(await toursRes.json());
      if (perfsRes.ok) setPerformances(await perfsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTour = async () => {
    if (!newTourName.trim()) return;
    setSavingTour(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/tours/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTourName.trim() })
      });
      if (res.ok) {
        setShowTourModal(false);
        setNewTourName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTour(false);
    }
  };

  const standalonePerformances = performances.filter(p => !p.tour);

  const filteredTours = tours.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSingles = standalonePerformances.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="Concerts"
        subtitle="ツアーや単発のライブ、セットリストを管理します"
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('tours')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'tours' ? '#1DB954' : 'var(--bg-tertiary)',
            color: activeTab === 'tours' ? '#fff' : 'var(--text-primary)',
            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s'
          }}
        >
          🎤 ツアー一覧
        </button>
        <button
          onClick={() => setActiveTab('singles')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'singles' ? '#1DB954' : 'var(--bg-tertiary)',
            color: activeTab === 'singles' ? '#fff' : 'var(--text-primary)',
            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s'
          }}
        >
          🎸 単発ライブ一覧
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ flex: 1, maxWidth: '600px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="イベント名を検索..."
          />
        </div>
        <button
          onClick={() => activeTab === 'tours' ? setShowTourModal(true) : alert('単独ライブはまだ未実装です')}
          style={{
            background: '#1DB954', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Plus size={18} />
          {activeTab === 'tours' ? '新規ツアー登録' : '新規ライブ登録'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {activeTab === 'tours' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredTours.map(tour => (
                <Link key={tour.id} to={`/tours/${tour.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{tour.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'singles' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredSingles.map(perf => (
                <Link key={perf.id} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{perf.name}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> {perf.date}</span>
                      {perf.venue && <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} /> {perf.venue.name}</span>}
                      {perf.main_artist && <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} /> {perf.main_artist.name}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* 新規ツアー作成モーダル */}
      {showTourModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '24px' }}>新規ツアー登録</h2>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ツアー・シリーズ名</label>
              <input
                type="text"
                value={newTourName}
                onChange={e => setNewTourName(e.target.value)}
                placeholder="例: TOUR 2024『Catcher In The Spy』"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowTourModal(false)}
                style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateTour}
                disabled={savingTour || !newTourName.trim()}
                style={{
                  padding: '10px 20px', borderRadius: '24px', background: '#1DB954', color: '#fff', border: 'none',
                  cursor: (savingTour || !newTourName.trim()) ? 'not-allowed' : 'pointer', opacity: (savingTour || !newTourName.trim()) ? 0.5 : 1
                }}
              >
                {savingTour ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Concerts;
