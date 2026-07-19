import { Play, Heart, Ticket } from 'lucide-react';

const Dashboard = () => {
  // Dummy data for mockups
  const newSongs = [
    { id: 1, title: 'Midnight Echoes', artist: 'Luna Ray', genre: 'Indie Pop', img: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 2, title: 'Solar Flare', artist: 'Apex Beats', genre: 'Electronic', img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 3, title: 'Stardust Serenade', artist: 'Lyra', genre: 'Lo-Fi', img: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=200&h=200' },
  ];

  const upcomingConcerts = [
    { id: 1, title: 'Eclipse Festival', artist: 'The Velvets', date: 'Oct 18, 2026 | 8 PM', venue: 'Red Rocks Amphitheater', img: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=400&h=250' },
    { id: 2, title: 'Neon Waves Tour', artist: 'Synthetix', date: 'Oct 21, 2026 | 9 PM', venue: 'The Novo, LA', img: 'https://images.unsplash.com/photo-1540039155732-61ee14e15cb9?auto=format&fit=crop&q=80&w=400&h=250' },
    { id: 3, title: 'Rhythm & Soul Night', artist: 'Jazz Collective', date: 'Oct 25, 2026', venue: 'Blue Note, NY', img: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=400&h=250' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Welcome Banner */}
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
          Welcome back, <span className="gradient-text">Alex!</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Here is what is happening in your music world today.</p>
      </div>

      {/* New Songs Section */}
      <section>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: 'var(--text-tertiary)' }}>
          New Songs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {newSongs.map((song) => (
            <div key={song.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <img src={song.img} alt={song.title} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0' }}>{song.title}</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{song.artist}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {song.genre}
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ color: 'var(--text-secondary)' }}><Heart size={20} /></button>
                  <button style={{ color: 'var(--accent-primary)' }}><Play size={20} fill="currentColor" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Concerts Section */}
      <section>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: 'var(--text-tertiary)' }}>
          Upcoming Concerts
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {upcomingConcerts.map((concert) => (
            <div key={concert.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <img src={concert.img} alt={concert.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{concert.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Artist:</strong> {concert.artist}</span>
                  <span>🗓 {concert.date}</span>
                  <span>📍 {concert.venue}</span>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button style={{ padding: '8px 24px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '20px', fontWeight: 500, border: '1px solid var(--border-color)' }}>
                    Get Tickets
                  </button>
                  <button style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Ticket size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
