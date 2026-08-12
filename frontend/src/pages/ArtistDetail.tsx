import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Plus, Calendar, Disc, Users, X, Search, MapPin, Music, Disc3 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SongCard from '../components/SongCard';
import type { SongCardData } from '../types/models';

interface AlbumMini {
  id: number;
  main_title: string;
  cover_image_url: string | null;
  album_group_id?: number;
  release_date?: string;
  album_type?: string;
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
  cover_image_url?: string | null;
  is_video?: boolean;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'albums' | 'performances' | 'songs') || 'albums';
  const setActiveTab = (tab: 'albums' | 'performances' | 'songs') => {
    setSearchParams({ tab }, { replace: true });
  };
  const navigate = useNavigate();


  const [isEditing, setIsEditing] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editSpotifyId, setEditSpotifyId] = useState("");
  
  // Member edit states
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [newMemberStartDate] = useState("");
  const [newMemberEndDate] = useState("");
  
  // Tag edit states
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  // Album sort & filter states
  const [albumSortOrder, setAlbumSortOrder] = useState<'desc' | 'asc'>('desc');
  const [albumTypeFilters, setAlbumTypeFilters] = useState<string[]>([]);

  const fetchArtist = () => {
    fetch(`http://127.0.0.1:8000/artists/${id}`)
      .then(res => res.json())
      .then(data => {
        setArtist(data);
        setEditImageUrl(data.image_url || "");
        setEditSpotifyId(data.spotify_artist_id || "");
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArtist();
    fetch('http://127.0.0.1:8000/tags/')
      .then(res => res.json())
      .then(data => setAvailableTags(data))
      .catch(err => console.error(err));
  }, [id]);

  const saveBasicInfo = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: editImageUrl, spotify_artist_id: editSpotifyId })
      });
      setIsEditing(false);
      fetchArtist();
    } catch (e) { console.error(e); }
  };

  const searchMembers = async () => {
    if (!memberSearchQuery.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/artists/?q=${encodeURIComponent(memberSearchQuery)}`);
      if (res.ok) {
        setMemberSearchResults(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const addMember = async (memberId: number) => {
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          member_artist_id: memberId, 
          start_date: newMemberStartDate || null, 
          end_date: newMemberEndDate || null 
        })
      });
      setIsAddingMember(false);
      fetchArtist();
    } catch (e) { console.error(e); }
  };

  const removeMember = async (memberId: number) => {
    if (!confirm('本当にこのメンバーを削除しますか？')) return;
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}/members/${memberId}`, { method: 'DELETE' });
      fetchArtist();
    } catch (e) { console.error(e); }
  };

  const addTag = async () => {
    if (!selectedTagId) return;
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: parseInt(selectedTagId) })
      });
      fetchArtist();
      setSelectedTagId("");
    } catch (e) { console.error(e); }
  };

  const removeTag = async (tagId: number) => {
    if (!confirm('このタグを削除しますか？')) return;
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}/tags/${tagId}`, { method: 'DELETE' });
      fetchArtist();
    } catch (e) { console.error(e); }
  };

  const updateMemberDates = async (memberId: number, start: string, end: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/artists/${id}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: start || null, end_date: end || null })
      });
      fetchArtist();
    } catch (e) { console.error(e); }
  };


  if (loading) return <LoadingSpinner />;
  if (!artist) return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--error-color)' }}>Artist not found.</div>;

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

      <div className="responsive-detail-header" style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px' }}>
        <button 
          onClick={() => setIsEditing(true)}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
        >
          <Edit3 size={18} />
        </button>

        <div className="responsive-cover" style={{ display: 'flex', borderRadius: '50%', background: 'var(--bg-tertiary)', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--border-color)', overflow: 'hidden' }}>
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Users size={64} color="var(--text-tertiary)" />
          )}
        </div>
        <div className="metadata-container">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {artist.tags && artist.tags.map(tag => (
              <span key={tag.id} style={{ background: tag.color || 'var(--primary-color)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                {tag.name}
              </span>
            ))}
          </div>
          <div className="title-action-wrapper">
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{artist.name}</h1>
          </div>
          
          {artist.spotify_artist_id && (
            <a href={`https://open.spotify.com/artist/${artist.spotify_artist_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--spotify-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px', width: 'fit-content' }}>
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
                    <div style={{ display: 'flex', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                       {m.image_url ? (
                         <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                         <Users size={16} color="var(--text-tertiary)" />
                       )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Link to={`/artists/${m.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}>
                        {m.name}
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {m.start_date ? m.start_date.split('-')[0] : '過去'} - {m.end_date ? m.end_date.split('-')[0] : '現在'}
                      </span>
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
      {activeTab === 'albums' && (() => {
        // Prepare unique albums
        const uniqueAlbums = Array.from(new Map((artist.albums || []).map(album => [album.album_group_id || `album_${album.id}`, album])).values());
        
        // Filter
        const filteredAlbums = uniqueAlbums.filter(album => {
          if (albumTypeFilters.length === 0) return true;
          return albumTypeFilters.includes(album.album_type || '');
        });

        // Sort
        filteredAlbums.sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return albumSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const toggleFilter = (type: string) => {
          if (albumTypeFilters.includes(type)) {
            setAlbumTypeFilters(albumTypeFilters.filter(t => t !== type));
          } else {
            setAlbumTypeFilters([...albumTypeFilters, type]);
          }
        };

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleFilter('album')}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: albumTypeFilters.includes('album') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: albumTypeFilters.includes('album') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  アルバム
                </button>
                <button
                  onClick={() => toggleFilter('single')}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: albumTypeFilters.includes('single') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: albumTypeFilters.includes('single') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  シングル
                </button>
                <button
                  onClick={() => toggleFilter('dvd')}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: albumTypeFilters.includes('dvd') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: albumTypeFilters.includes('dvd') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  映像作品
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={albumSortOrder} 
                  onChange={(e) => setAlbumSortOrder(e.target.value as 'desc' | 'asc')}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="desc">発売日が新しい順</option>
                  <option value="asc">発売日が古い順</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {filteredAlbums.map(album => (
                <Link key={album.id} to={album.album_group_id ? `/album-groups/${album.album_group_id}` : `/albums/${album.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    boxSizing: 'border-box'
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
          {filteredAlbums.length === 0 && <EmptyState icon={Disc} title="該当する作品がありません" />}
        </div>
      </div>
        );
      })()}

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
                      <span style={{ background: 'var(--warning-bg)', color: '#ff9800', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>Guest / Festival</span>
                    ) : (
                      <span style={{ background: 'var(--success-bg)', color: '#4caf50', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>Main Act</span>
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
          {allPerformances.length === 0 && <EmptyState icon={Calendar} title="ライブ情報がありません" />}
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
                  <div key={idx} style={{ height: '100%' }}>
                    <SongCard 
                      song={{
                        id: contribution.song_id,
                        title: contribution.title,
                        role: contribution.roles.join(', '),
                        cover_image_url: contribution.cover_image_url,
                        is_video: contribution.is_video || false,
                        is_streaming_available: true,
                        artist_name: artist.name
                      } as SongCardData}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(songsByRole).length === 0 && <EmptyState icon={Music} title="楽曲情報がありません" />}
        </div>
      )}


      {/* 編集モーダル */}
      {isEditing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '32px', borderRadius: '16px', width: '700px', maxWidth: '100%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{artist.name} の編集</h2>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>画像URL (アー写・ロゴ等)</label>
                <input 
                  type="text" 
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px', boxSizing: 'border-box' }}
                />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>※著作権に配慮し、公式のURLやSpotify等のURLを指定してください。</small>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Spotify Artist ID</label>
                <input 
                  type="text" 
                  value={editSpotifyId}
                  onChange={(e) => setEditSpotifyId(e.target.value)}
                  placeholder="例: 1vPNhY14LpuL46sTXGvD80"
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={saveBasicInfo} style={{ background: 'var(--primary-color)', border: 'none', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                基本情報を保存
              </button>
            </div>

            <hr style={{ borderColor: 'var(--border-color)', marginBottom: '24px' }} />

            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>タグ管理</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {artist.tags && artist.tags.map(tag => (
                <span key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: tag.color || 'var(--primary-color)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {tag.name}
                  <button onClick={() => removeTag(tag.id)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0, marginLeft: '4px', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', alignItems: 'center' }}>
              <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)} style={{ flex: 1, minWidth: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}>
                <option value="">タグを選択...</option>
                {availableTags.filter(t => !artist.tags?.find(at => at.id === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={addTag} style={{ whiteSpace: 'nowrap', flexShrink: 0, background: 'var(--accent-primary)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>追加</button>
            </div>
            <hr style={{ borderColor: 'var(--border-color)', marginBottom: '24px', marginTop: '32px' }} />

            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>メンバー管理</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {artist.members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', width: '150px' }}>{m.name}</div>
                  <input 
                    type="date" 
                    value={m.start_date || ""}
                    onChange={(e) => updateMemberDates(m.id, e.target.value, m.end_date || "")}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px' }}
                  />
                  <span>〜</span>
                  <input 
                    type="date" 
                    value={m.end_date || ""}
                    onChange={(e) => updateMemberDates(m.id, m.start_date || "", e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px' }}
                  />
                  <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', marginLeft: 'auto' }}><Trash2 size={18} /></button>
                </div>
              ))}
            </div>

            {!isAddingMember ? (
              <button onClick={() => setIsAddingMember(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px dashed #666', color: 'var(--text-secondary)', padding: '12px', borderRadius: '8px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <Plus size={18} /> 新しいメンバーを追加
              </button>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    placeholder="アーティスト名で検索..." 
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchMembers()}
                    style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
                  />
                  <button onClick={searchMembers} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}><Search size={18} /></button>
                </div>
                
                {memberSearchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {memberSearchResults.map(res => (
                      <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        <span>{res.name}</span>
                        <button onClick={() => addMember(res.id)} style={{ background: 'var(--primary-color)', border: 'none', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>追加</button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button onClick={() => { setIsAddingMember(false); setMemberSearchResults([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistDetail;
