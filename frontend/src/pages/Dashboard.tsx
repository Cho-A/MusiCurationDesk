import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Disc, Mic2, Calendar, Play, Sparkles, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  total_songs?: number;
  total_artists?: number;
  total_albums?: number;
  total_performances?: number;
  total_songs_experienced?: number;
  unique_songs_experienced?: number;
}

interface RecentAlbum {
  id: number;
  title: string;
  cover_image_url: string | null;
  release_date: string | null;
}

interface RecentSong {
  id: number;
  title: string;
  jasrac_code: string | null;
  created_at: string;
}

interface RandomDiscovery {
  id: number;
  title: string;
  album_title: string | null;
  cover_image_url: string | null;
}

const Dashboard = () => {
  const { isAuthenticated, token, user } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([]);
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>([]);
  const [discovery, setDiscovery] = useState<RandomDiscovery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers: Record<string, string> = isAuthenticated && token ? { 'Authorization': `Bearer ${token}` } : {};
        const statsUrl = isAuthenticated ? 'http://127.0.0.1:8000/dashboard/stats/me' : 'http://127.0.0.1:8000/dashboard/stats';
        const recentUrl = isAuthenticated ? 'http://127.0.0.1:8000/dashboard/recent/me' : 'http://127.0.0.1:8000/dashboard/recent';

        const [statsRes, recentRes, discoveryRes] = await Promise.all([
          fetch(statsUrl, { headers }),
          fetch(recentUrl, { headers }),
          fetch('http://127.0.0.1:8000/dashboard/discovery')
        ]);

        const statsData = await statsRes.json();
        const recentData = await recentRes.json();
        const discoveryData = await discoveryRes.json();

        setStats(statsData);
        setRecentAlbums(recentData?.recent_albums || []);
        setRecentSongs(recentData?.recent_songs || []);
        setDiscovery(discoveryData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, token]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading Dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Main Content Area (Left 75%) */}
      <div style={{ flex: '1 1 75%', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* KPI Stats Header */}
        <div style={{ marginBottom: '-16px' }}>
          <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700 }}>
            {isAuthenticated ? `Welcome back, ${user?.username}` : 'Global Music Database'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {isAuthenticated ? 'Your personal music stats and recent updates' : 'Explore the latest additions to the database'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {isAuthenticated ? [
            { label: 'Owned Albums', value: stats?.total_albums, icon: <Disc size={24} color="#1DB954" /> },
            { label: 'Live Concerts', value: stats?.total_performances, icon: <Calendar size={24} color="#1DB954" /> },
            { label: 'Songs Experienced', value: stats?.total_songs_experienced, icon: <Headphones size={24} color="#1DB954" /> },
            { label: 'Unique Songs', value: stats?.unique_songs_experienced, icon: <Music size={24} color="#1DB954" /> },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ background: 'rgba(29, 185, 84, 0.1)', padding: '12px', borderRadius: '12px' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stat.value || 0}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          )) : [
            { label: 'Total Songs', value: stats?.total_songs, icon: <Music size={24} color="#1DB954" /> },
            { label: 'Albums', value: stats?.total_albums, icon: <Disc size={24} color="#1DB954" /> },
            { label: 'Artists', value: stats?.total_artists, icon: <Mic2 size={24} color="#1DB954" /> },
            { label: 'Live Performances', value: stats?.total_performances, icon: <Calendar size={24} color="#1DB954" /> },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ background: 'rgba(29, 185, 84, 0.1)', padding: '12px', borderRadius: '12px' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stat.value || 0}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recently Added Albums (Carousel style layout) */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {isAuthenticated ? 'For You: Recent Albums' : 'Recently Added Albums'}
            </h2>
          </div>
          
          <div style={{ 
            display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            {recentAlbums.length > 0 ? recentAlbums.map(album => (
              <div key={album.id} style={{ 
                minWidth: '200px', maxWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px',
                cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ 
                  width: '200px', height: '200px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Disc size={48} color="rgba(255,255,255,0.1)" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {album.title}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {album.release_date || 'Unknown Date'}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ color: '#666' }}>No albums added yet.</div>
            )}
          </div>
        </section>

        {/* Recently Added Songs (List format) */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>
            {isAuthenticated ? 'For You: Recent Songs' : 'Recently Added Songs'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {recentSongs.length > 0 ? recentSongs.map(song => (
              <Link to={`/songs/${song.id}`} key={song.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
                  transition: 'background 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '50%' }}>
                    <Play size={16} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                      {song.jasrac_code ? `JASRAC: ${song.jasrac_code}` : 'No code'}
                    </div>
                  </div>
                </div>
              </Link>
            )) : (
              <div style={{ color: '#666' }}>No songs added yet.</div>
            )}
          </div>
        </section>
      </div>

      {/* Sidebar Area (Right 25%) */}
      <div style={{ flex: '1 1 25%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Today's Discovery Widget */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(29,185,84,0.1) 0%, rgba(18,140,61,0.05) 100%)',
          border: '1px solid rgba(29,185,84,0.2)', borderRadius: '20px', padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1DB954', marginBottom: '20px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Sparkles size={18} />
            Today's Discovery
          </div>
          
          {discovery ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ 
                width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.4)', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}>
                {discovery.cover_image_url ? (
                  <img src={discovery.cover_image_url} alt="Discovery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Music size={64} color="rgba(255,255,255,0.2)" />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.4rem', margin: '0 0 8px 0', fontWeight: 700 }}>{discovery.title}</h3>
                {discovery.album_title && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>from {discovery.album_title}</div>
                )}
              </div>
              <Link to={`/songs/${discovery.id}`} style={{ textDecoration: 'none', width: '100%', marginTop: '8px' }}>
                <button style={{ 
                  width: '100%', padding: '12px', borderRadius: '30px', background: '#1DB954', color: '#000',
                  fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}>
                  <Play fill="currentColor" size={18} />
                  Listen / Details
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No music available to discover.</div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
