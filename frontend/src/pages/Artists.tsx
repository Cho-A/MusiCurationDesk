import { useEffect, useState } from 'react';
import { Users, Disc, Music } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';

interface Artist {
  id: number;
  name: string;
  spotify_artist_id: string | null;
}

const Artists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/artists/');
        if (res.ok) {
          const data = await res.json();
          setArtists(data);
        }
      } catch (err) {
        console.error("Failed to fetch artists", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  const filteredArtists = artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="Artists"
        subtitle="アーティスト情報の閲覧と管理を行います"
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="登録済みアーティストを検索..."
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : filteredArtists.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
          アーティストが見つかりません。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredArtists.map(artist => (
            <div key={artist.id} className="glass-panel" style={{
              padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px', textAlign: 'center', transition: 'transform 0.2s',
              cursor: 'pointer'
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1DB954 0%, #128C3D 100%)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 8px 16px rgba(29, 185, 84, 0.2)'
              }}>
                <Users size={32} color="white" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{artist.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Disc size={14} /> Albums</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Music size={14} /> Songs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Artists;
