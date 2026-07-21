import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

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
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/tours/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setTour(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '64px', textAlign: 'center', color: '#888' }}>Loading Tour...</div>;
  if (!tour) return <div style={{ padding: '64px', textAlign: 'center', color: '#ff4444' }}>Tour not found.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '40px' }}>
        <span style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tour / Event Series</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '8px 0', lineHeight: 1.2 }}>
          {tour.name}
        </h1>
        <div style={{ color: '#888', marginTop: '8px' }}>
          全 {tour.performances.length} 公演
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tour.performances.map((perf) => (
          <Link key={perf.id} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    marginRight: '8px'
                  }}>
                    {perf.event_type}
                  </span>
                  <span style={{ color: '#4CAF50', fontWeight: 600, fontSize: '0.9rem' }}>{perf.date}</span>
                </div>
              </div>
              
              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.4rem' }}>{perf.name}</h2>
              
              <div style={{ display: 'flex', gap: '24px', color: '#aaa', fontSize: '0.95rem' }}>
                {perf.main_artist ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👤</span> {perf.main_artist.name}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF9800', fontWeight: 600 }}>
                    <span>✨</span> Special Session
                  </div>
                )}
                {perf.venue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span> {perf.venue.name} {perf.venue.prefecture && `(${perf.venue.prefecture})`}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TourDetail;
