import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Disc, Mic2, Calendar, Play, Sparkles, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import AlbumCard, { type Album } from '../components/AlbumCard';
import SongCard from '../components/SongCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

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
  album_group_id?: number;
}

interface RecentSong {
  id: number;
  title: string;
  artist_name: string;
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
    let mounted = true;
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

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (mounted) setStats(statsData);
        }
        
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          if (mounted) {
            setRecentAlbums(recentData.recent_albums || []);
            setRecentSongs(recentData.recent_songs || []);
          }
        }
        
        if (discoveryRes.ok) {
          const discoveryData = await discoveryRes.json();
          if (mounted) setDiscovery(discoveryData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { mounted = false; };
  }, [isAuthenticated, token]);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Main Content Area (Left 75%) */}
      <div style={{ flex: '1 1 min(75%, 1000px)', display: 'flex', flexDirection: 'column', gap: '40px', minWidth: '300px' }}>
        
        {/* KPI Stats Header */}
        <PageHeader 
          title={isAuthenticated ? `おかえりなさい、${user?.username}` : 'グローバル音楽データベース'}
          subtitle={isAuthenticated ? 'あなた個人の音楽統計と最近の更新' : 'データベースへの最新の追加情報を探る'}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {isAuthenticated ? [
            { label: '所有アルバム', value: stats?.total_albums, icon: <Disc size={24} color="#1DB954" /> },
            { label: 'ライブ公演', value: stats?.total_performances, icon: <Calendar size={24} color="#1DB954" /> },
            { label: '経験した楽曲', value: stats?.total_songs_experienced, icon: <Headphones size={24} color="#1DB954" /> },
            { label: 'ユニークな楽曲', value: stats?.unique_songs_experienced, icon: <Music size={24} color="#1DB954" /> },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ background: 'var(--spotify-bg)', padding: '12px', borderRadius: '12px' }}>
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
            { label: '合計楽曲数', value: stats?.total_songs, icon: <Music size={24} color="#1DB954" /> },
            { label: 'アルバム数', value: stats?.total_albums, icon: <Disc size={24} color="#1DB954" /> },
            { label: 'アーティスト数', value: stats?.total_artists, icon: <Mic2 size={24} color="#1DB954" /> },
            { label: 'ライブ公演数', value: stats?.total_performances, icon: <Calendar size={24} color="#1DB954" /> },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ background: 'var(--spotify-bg)', padding: '12px', borderRadius: '12px' }}>
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
              {isAuthenticated ? 'おすすめ: 最近のアルバム' : '最近追加されたアルバム'}
            </h2>
          </div>
          
          <div style={{ 
            display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            {recentAlbums.length > 0 ? Array.from(new Map(recentAlbums.map(album => [album.album_group_id || `album_${album.id}`, album])).values()).map(album => (
              <div key={album.id} style={{ minWidth: '200px', maxWidth: '200px' }}>
                <AlbumCard album={album as unknown as Album} layout="vertical" />
              </div>
            )) : (
              <EmptyState title="最近追加されたアルバムがありません" description="新しくアルバムを追加してください。" />
            )}
          </div>
        </section>

        {/* Recently Added Songs (List format) */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>
            {isAuthenticated ? 'あなたへのおすすめ' : '最近追加された楽曲'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {recentSongs.length > 0 ? recentSongs.map(song => (
              <div key={song.id} style={{ height: '100%' }}>
                <SongCard song={song} isDashboard={true} />
              </div>
            )) : (
              <EmptyState title="最近追加された楽曲がありません" description="新しく楽曲を追加してください。" />
            )}
          </div>
        </section>
      </div>

      {/* Sidebar Area (Right 25%) */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Today's Discovery Widget */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(29,185,84,0.1) 0%, rgba(18,140,61,0.05) 100%)',
          border: '1px solid rgba(29,185,84,0.2)', borderRadius: '20px', padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--spotify-color)', marginBottom: '20px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Sparkles size={18} />
            PICK UP
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
                  width: '100%', padding: '12px', borderRadius: '30px', background: 'var(--spotify-color)', color: '#000',
                  fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}>
                  <Play fill="currentColor" size={18} />
                  Listen / Details
                </button>
              </Link>
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="ピックアップできる楽曲がありません" description="楽曲を追加して、新しい発見を楽しみましょう。" />
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
