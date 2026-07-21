import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users, ArrowLeft } from 'lucide-react';

interface Venue {
  id: number;
  name: string;
  prefecture?: string;
}

interface Artist {
  id: number;
  name: string;
}

interface Performance {
  id: number;
  name: string;
  date: string;
  event_type: string;
  stage_name?: string;
  venue?: Venue;
  main_artist?: Artist;
}

interface TourDetail {
  id: number;
  name: string;
  performances: Performance[];
}

const TourDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [newPerfName, setNewPerfName] = useState("");
  const [newPerfDate, setNewPerfDate] = useState("");
  const [savingPerf, setSavingPerf] = useState(false);

  useEffect(() => {
    fetchTour();
  }, [id]);

  const fetchTour = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/tours/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setTour(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAddPerformance = async () => {
    if (!newPerfName.trim() || !newPerfDate) return;
    setSavingPerf(true);
    try {
      const payload = {
        name: newPerfName.trim(),
        date: newPerfDate,
        tour_id: Number(id),
        performance_type: "Tour",
        event_type: "Live"
      };

      const res = await fetch('http://127.0.0.1:8000/performances/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setNewPerfName("");
        setNewPerfDate("");
        fetchTour();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPerf(false);
    }
  };

  if (loading) return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Tour...</div>;
  if (!tour) return <div style={{ padding: '64px', textAlign: 'center', color: '#ff4444' }}>Tour not found.</div>;

  // 開催日ごとに公演をグループ化
  const groupedPerformances = tour.performances.reduce((acc, perf) => {
    if (!acc[perf.date]) acc[perf.date] = [];
    acc[perf.date].push(perf);
    return acc;
  }, {} as Record<string, Performance[]>);

  const sortedDates = Object.keys(groupedPerformances).sort();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px', paddingBottom: '60px' }}>
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

      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tour / Event Series</span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '8px 0', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {tour.name}
          </h1>
          <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            全 {tour.performances.length} 公演
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--primary-color)', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s'
          }}
        >
          <Plus size={18} />
          公演を追加
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {sortedDates.map((date) => (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{date}</h2>
              <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {groupedPerformances[date].map((perf) => (
                <Link key={perf.id} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    height: '100%',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-color)'
                      }}>
                        {perf.event_type}
                      </span>
                    </div>
                    
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {perf.name}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {perf.stage_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          🎤 {perf.stage_name}
                        </div>
                      )}
                      {perf.main_artist ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={16} /> {perf.main_artist.name}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF9800', fontWeight: 600 }}>
                          ✨ Special Session
                        </div>
                      )}
                      {perf.venue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={16} /> {perf.venue.name} {perf.venue.prefecture && `(${perf.venue.prefecture})`}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 公演追加モーダル */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>新しい公演を追加</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>公演名</label>
              <input
                type="text"
                value={newPerfName}
                onChange={e => setNewPerfName(e.target.value)}
                placeholder="例: 東京公演 Day1"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>開催日</label>
              <input
                type="date"
                value={newPerfDate}
                onChange={e => setNewPerfDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
              ※出演アーティストや会場の指定は、現時点では未対応です。作成後にセットリスト等の編集が可能です。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddPerformance}
                disabled={savingPerf || !newPerfName.trim() || !newPerfDate}
                style={{
                  padding: '10px 20px', borderRadius: '24px', background: 'var(--primary-color)', color: '#fff', border: 'none',
                  cursor: (savingPerf || !newPerfName.trim() || !newPerfDate) ? 'not-allowed' : 'pointer',
                  opacity: (savingPerf || !newPerfName.trim() || !newPerfDate) ? 0.5 : 1
                }}
              >
                {savingPerf ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourDetail;
