import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Disc3, Music, Calendar, MapPin } from 'lucide-react';
import PageHeader from '../components/PageHeader';

interface AlbumMini {
  id: number;
  main_title: string;
  cover_image_url: string | null;
}

interface Performance {
  id: number;
  name: string;
  date: string;
  event_type: string;
  venue?: { name: string; prefecture?: string };
  tour?: { id: number; name: string };
}

interface SongContribution {
  song_id: number;
  title: string;
  roles: string[];
}

interface AliasInfo {
  alias_name: string;
  context: string | null;
}

interface ArtistDetail {
  id: number;
  name: string;
  spotify_artist_id: string | null;
  notes: string | null;
  aliases: AliasInfo[];
  albums: AlbumMini[];
  performances: Performance[];
  songs_contributed: SongContribution[];
}

const ArtistDetail = () => {
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'albums' | 'performances' | 'songs'>('albums');

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/artists/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => setArtist(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Artist...</div>;
  if (!artist) return <div style={{ padding: '64px', textAlign: 'center', color: '#ff4444' }}>Artist not found.</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 16px', paddingBottom: '60px' }}>
      <PageHeader
        title={artist.name}
        subtitle="アーティスト詳細"
      />

      {artist.aliases.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {artist.aliases.map((alias, idx) => (
            <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
              別名義: {alias.alias_name} {alias.context && `(${alias.context})`}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('albums')}
          style={{
            padding: '12px 16px', background: 'transparent',
            border: 'none', borderBottom: activeTab === 'albums' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'albums' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'albums' ? 700 : 500, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Disc3 size={18} /> 主催アルバム ({artist.albums.length})</div>
        </button>
        <button
          onClick={() => setActiveTab('performances')}
          style={{
            padding: '12px 16px', background: 'transparent',
            border: 'none', borderBottom: activeTab === 'performances' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'performances' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'performances' ? 700 : 500, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> 主催ライブ ({artist.performances.length})</div>
        </button>
        <button
          onClick={() => setActiveTab('songs')}
          style={{
            padding: '12px 16px', background: 'transparent',
            border: 'none', borderBottom: activeTab === 'songs' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'songs' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'songs' ? 700 : 500, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Music size={18} /> 参加楽曲 ({artist.songs_contributed.length})</div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'albums' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {artist.albums.map(album => (
            <Link key={album.id} to={`/albums/${album.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{
                background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px',
                border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.main_title} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <Disc3 size={40} color="var(--text-tertiary)" />
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {album.main_title}
                </div>
              </div>
            </Link>
          ))}
          {artist.albums.length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>アルバム情報がありません</div>}
        </div>
      )}

      {activeTab === 'performances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {artist.performances.map(perf => (
            <Link key={perf.id} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px',
                border: '1px solid var(--border-color)', transition: 'transform 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <div>
                  <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{perf.date}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>{perf.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
                    {perf.tour && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🎤 {perf.tour.name}</span>}
                    {perf.venue && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {perf.venue.name}</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {artist.performances.length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>ライブ情報がありません</div>}
        </div>
      )}

      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {artist.songs_contributed.map((contribution, idx) => (
            <Link key={`${contribution.song_id}-${idx}`} to={`/songs/${contribution.song_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px',
                border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={20} color="var(--primary-color)" />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{contribution.title}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {contribution.roles.map(role => (
                    <span key={role} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
          {artist.songs_contributed.length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>参加楽曲情報がありません</div>}
        </div>
      )}

    </div>
  );
};

export default ArtistDetail;
