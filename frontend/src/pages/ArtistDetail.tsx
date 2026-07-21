import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Disc3, Music, Calendar, MapPin, ArrowLeft, Users } from 'lucide-react';

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
  isGuest?: boolean;
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

interface ArtistRelationshipInfo {
  id: number;
  name: string;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface TagInfo {
  id: number;
  name: string;
  color: string | null;
}

interface ArtistDetail {
  id: number;
  name: string;
  spotify_artist_id: string | null;
  image_url: string | null;
  notes: string | null;
  aliases: AliasInfo[];
  tags: TagInfo[];
  albums: AlbumMini[];
  performances: Performance[];
  performances_as_guest: Performance[];
  songs_contributed: SongContribution[];
  members: ArtistRelationshipInfo[];
}

const ArtistDetail = () => {
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'albums' | 'performances' | 'songs'>('albums');
  const navigate = useNavigate();

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

  // Combine and sort performances
  const allPerformances = [
    ...(artist.performances || []).map(p => ({ ...p, isGuest: false })),
    ...(artist.performances_as_guest || []).map(p => ({ ...p, isGuest: true }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group songs by role
  const songsByRole: Record<string, SongContribution[]> = {};
  (artist.songs_contributed || []).forEach(song => {
    song.roles.forEach(role => {
      if (!songsByRole[role]) songsByRole[role] = [];
      songsByRole[role].push(song);
    });
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 16px', paddingBottom: '60px' }}>
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

      <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginBottom: '32px', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px' }}>
        {artist.image_url ? (
          <img 
            src={artist.image_url} 
            alt="" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex');
            }}
            style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-color)', boxShadow: 'var(--shadow-md)', flexShrink: 0 }} 
          />
        ) : null}
        <div style={{ display: artist.image_url ? 'none' : 'flex', width: '160px', height: '160px', borderRadius: '50%', background: 'var(--bg-tertiary)', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--border-color)', flexShrink: 0 }}>
          <Users size={64} color="var(--text-tertiary)" />
        </div>
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {artist.tags && artist.tags.map(tag => (
              <span key={tag.id} style={{ background: tag.color || 'var(--primary-color)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                {tag.name}
              </span>
            ))}
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: 800 }}>{artist.name}</h1>
          
          {artist.spotify_artist_id && (
            <a href={`https://open.spotify.com/artist/${artist.spotify_artist_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1DB954', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px', width: 'fit-content' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z" />
              </svg>
              Spotifyで開く
            </a>
          )}
          
          {artist.members && artist.members.length > 0 && (
            <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '1.05rem', display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={18} />
                <strong>メンバー:</strong>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                {artist.members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {m.image_url ? (
                      <img 
                        src={m.image_url} 
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex');
                        }}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : null}
                    <div style={{ display: m.image_url ? 'none' : 'flex', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', alignItems: 'center', justifyContent: 'center' }}>
                       <Users size={16} color="var(--text-tertiary)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Link to={`/artists/${m.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>
                        {m.name}
                      </Link>
                      {(m.start_date || m.end_date) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {m.start_date ? m.start_date.split('-')[0] : ''} - {m.end_date ? m.end_date.split('-')[0] : '現在'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {artist.aliases && artist.aliases.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {artist.aliases.map((alias, idx) => (
                <span key={idx} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                  別名義: {alias.alias_name} {alias.context && `(${alias.context})`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Disc3 size={18} /> リリース作品 ({(artist.albums || []).length})</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> ライブ・イベント ({allPerformances.length})</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Music size={18} /> 楽曲 ({(artist.songs_contributed || []).length})</div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'albums' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {(artist.albums || []).map(album => (
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
                  <img src={album.cover_image_url} alt={album.main_title} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }} />
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
          {(artist.albums || []).length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>リリース作品がありません</div>}
        </div>
      )}

      {activeTab === 'performances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allPerformances.map((perf, idx) => (
            <Link key={`${perf.id}-${idx}`} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px',
                border: '1px solid var(--border-color)', transition: 'transform 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <div>
                  <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {perf.date}
                    {perf.isGuest ? (
                      <span style={{ background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>Guest / Festival</span>
                    ) : (
                      <span style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>Main Act</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>{perf.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
                    {perf.tour && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🎤 {perf.tour.name}</span>}
                    {perf.venue && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {perf.venue.name}</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {allPerformances.length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>ライブ情報がありません</div>}
        </div>
      )}

      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(songsByRole).map(([role, songs]) => (
            <div key={role}>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                {role} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', fontWeight: 'normal' }}>({songs.length})</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {songs.map((contribution, idx) => (
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
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(songsByRole).length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>楽曲情報がありません</div>}
        </div>
      )}

    </div>
  );
};

export default ArtistDetail;
