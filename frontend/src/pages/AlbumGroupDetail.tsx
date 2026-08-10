import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Disc3, AlertCircle, Edit2, Save, X, GitMerge } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';

const generateGradient = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  const c2 = ((hash >> 4) & 0x00FFFFFF).toString(16).toUpperCase();
  return `linear-gradient(135deg, #${'00000'.substring(0, 6 - c1.length) + c1}, #${'00000'.substring(0, 6 - c2.length) + c2})`;
};

const FallbackCoverDetail = ({ title, size }: { title: string; size: string | number }) => (
  <div style={{
    width: size,
    height: size,
    background: generateGradient(title),
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
    flexShrink: 0
  }}>
    <Disc3 color="rgba(255,255,255,0.7)" size={typeof size === 'number' ? size * 0.4 : 100} />
  </div>
);

interface SongMini {
  id: number;
  title: string;
  spotify_song_id?: string | null;
  is_video?: boolean;
  version_name?: string;
  is_streaming_available?: boolean;
  track_category?: string | null;
}

interface AlbumDisc {
  id: number;
  disc_number: number;
  title: string | null;
  media_format: string | null;
  edition: string | null;
}

interface AlbumTrack {
  id: number;
  song_id: number;
  track_number: number;
  disc_number: number;
  duration_ms?: number | null;
  display_title?: string;
  notes?: string;
  media_format?: string;
  is_unreleased?: boolean;
  song: SongMini;
}

interface AlbumDetailData {
  id: number;
  main_title: string;
  version_title?: string;
  artist_id?: number;
  physical_release_date?: string;
  digital_release_date?: string;
  cover_image_url?: string;
  album_type?: string;
  media_format?: string;
  total_tracks?: number;
  spotify_album_id?: string | null;
  artist?: {
    id: number;
    name: string;
  };
  is_saved: boolean;
  discs: AlbumDisc[];
  album_tracks: AlbumTrack[];
}

interface AlbumGroupDetailData {
  id: number;
  title: string;
  artist_id?: number;
  release_date?: string;
  cover_image_url?: string;
  album_type?: string;
  artist?: {
    id: number;
    name: string;
  };
  albums: AlbumDetailData[];
}

const AlbumGroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAlbumId = searchParams.get('album_id') ? parseInt(searchParams.get('album_id')!, 10) : null;

  const [albumGroup, setAlbumGroup] = useState<AlbumGroupDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(initialAlbumId);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{display_title: string, notes: string, song_id: number | null, song_title: string, is_unreleased: boolean, main_artist_id: number | null, main_artist_name: string}>({ display_title: '', notes: '', song_id: null, song_title: '', is_unreleased: false, main_artist_id: null, main_artist_name: '' });
  const [songSearchResults, setSongSearchResults] = useState<SongMini[]>([]);
  const [, setIsSearchingSong] = useState(false);
  const [trackArtistSearchResults, setTrackArtistSearchResults] = useState<{id: number, name: string}[]>([]);

  // For Album Artist Edit
  const [isEditingArtist, setIsEditingArtist] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [artistSearchResults, setArtistSearchResults] = useState<{id: number, name: string}[]>([]);
  
  // For Disc Title Edit
  const [editingDiscId, setEditingDiscId] = useState<number | null>(null);
  const [discTitleForm, setDiscTitleForm] = useState('');

  // For Edition Edit Modal
  const [isEditionModalOpen, setIsEditionModalOpen] = useState(false);
  const [editionForm, setEditionForm] = useState<{ version_title: string; album_group_id: number | null; media_format: string }>({ version_title: '', album_group_id: null, media_format: 'CD' });
  const [albumGroupSearchQuery, setAlbumGroupSearchQuery] = useState('');
  const [albumGroupSearchResults, setAlbumGroupSearchResults] = useState<{id: number, title: string, artist?: {name: string}}[]>([]);

  // Bulk Merge States
  const [isBulkMergeModalOpen, setIsBulkMergeModalOpen] = useState(false);
  const [bulkMergeSourceDisc, setBulkMergeSourceDisc] = useState<{albumId: number, discNumber: number, title: string | null} | null>(null);
  const [bulkMergeTargetAlbumId, setBulkMergeTargetAlbumId] = useState<number | null>(null);
  const [bulkMergeTargetDisc, setBulkMergeTargetDisc] = useState<number | ''>('');
  const [bulkMergeLoading, setBulkMergeLoading] = useState(false);

  // Group Multi-Edition Merge States
  const [isGroupMergeModalOpen, setIsGroupMergeModalOpen] = useState(false);
  const [groupMergeTargetId, setGroupMergeTargetId] = useState<number | null>(null);
  const [groupMergeSourceIds, setGroupMergeSourceIds] = useState<number[]>([]);



  const formatTime = (ms: number) => {
    return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  };

  const fetchAlbum = useCallback(() => {
    fetch(`http://127.0.0.1:8000/album-groups/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Album group not found");
        return res.json();
      })
      .then(data => {
        setAlbumGroup(data);
        if (data.albums && data.albums.length > 0) {
          const getScore = (title?: string) => {
            if (!title) return 1;
            const lower = title.toLowerCase();
            if (lower.includes('通常') || lower.includes('regular')) return 1;
            if (lower.includes('初回') || lower.includes('first press')) return 2;
            if (lower.includes('限定') || lower.includes('limited')) return 3;
            return 4;
          };
          const sorted = [...data.albums].sort((a, b) => {
            const scoreA = getScore(a.version_title);
            const scoreB = getScore(b.version_title);
            if (scoreA !== scoreB) return scoreA - scoreB;
            return (a.version_title || '').localeCompare(b.version_title || '');
          });
          if (!initialAlbumId || !data.albums.some((a: any) => a.id === initialAlbumId)) {
            setSelectedAlbumId(sorted[0].id);
          } else {
            setSelectedAlbumId(initialAlbumId);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchAlbum();
  }, [id]);

  const sortedAlbums = useMemo(() => {
    if (!albumGroup?.albums) return [];
    
    return [...albumGroup.albums].sort((a, b) => {
      const getScore = (title?: string) => {
        if (!title) return 1;
        const lower = title.toLowerCase();
        if (lower.includes('通常') || lower.includes('regular')) return 1;
        if (lower.includes('初回') || lower.includes('first press')) return 2;
        if (lower.includes('限定') || lower.includes('limited')) return 3;
        return 4;
      };

      const scoreA = getScore(a.version_title);
      const scoreB = getScore(b.version_title);
      
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.version_title || '').localeCompare(b.version_title || '');
    });
  }, [albumGroup?.albums]);

  const album = albumGroup?.albums?.find(a => a.id === selectedAlbumId) || null;

  useEffect(() => {
    if (!loading && albumGroup && window.location.hash) {
      const element = document.getElementById(window.location.hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loading, albumGroup]);

  const handleEditClick = (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTrackId(track.id);
    setEditForm({
      display_title: track.display_title || '',
      notes: track.notes || '',
      song_id: track.song.id,
      song_title: track.song.title,
      is_unreleased: track.is_unreleased || false,
      main_artist_id: null,
      main_artist_name: ''
    });
    setSongSearchResults([]);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTrackId(null);
    setSongSearchResults([]);
  };

  const handleSongSearch = async (query: string) => {
    setEditForm(prev => ({ ...prev, song_title: query }));
    if (query.length < 2) {
      setSongSearchResults([]);
      return;
    }
    setIsSearchingSong(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSongSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingSong(false);
    }
  };

  const handleArtistSearch = async (query: string) => {
    setArtistSearchQuery(query);
    if (query.length < 2) {
      setArtistSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/artists/?name_search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setArtistSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveArtist = async (artistId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/albums/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ artist_id: artistId })
      });
      if (res.ok) {
        toast.success("アーティストを更新しました");
        setIsEditingArtist(false);
        fetchAlbum();
      }
    } catch (err) {
      console.error(err);
      toast.error("更新に失敗しました");
    }
  };

  const handleCreateArtistForAlbum = async (name: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/artists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        handleSaveArtist(data.id);
      } else {
        toast.error('アーティストの作成に失敗しました');
      }
    } catch(err) {
      console.error(err);
      toast.error('アーティストの作成に失敗しました');
    }
  };

  const handleSaveDiscTitle = async (discId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/albums/${id}/discs/${discId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: discTitleForm })
      });
      if (res.ok) {
        toast.success("ディスク名を更新しました");
        setEditingDiscId(null);
        fetchAlbum();
      }
    } catch (err) {
      console.error(err);
      toast.error("更新に失敗しました");
    }
  };

  const handleSaveTrack = async (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/albums/${selectedAlbumId}/tracks/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_title: editForm.display_title || null,
          notes: editForm.notes || null,
          song_id: editForm.song_id,
          is_unreleased: editForm.is_unreleased
        })
      });
      
      if (!res.ok) throw new Error("Failed to update track");

      // Save Main Artist if provided
      if (editForm.main_artist_id && editForm.song_id) {
        const artistRes = await fetch(`http://127.0.0.1:8000/songs/${editForm.song_id}/main_artist`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ artist_id: editForm.main_artist_id })
        });
        if (!artistRes.ok) throw new Error("Failed to update main artist");
      }

      fetchAlbum();
      setEditingTrackId(null);
      toast.success('トラック情報を更新しました');
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました');
    }
  };

  const handleTrackArtistSearch = async (query: string) => {
    setEditForm(prev => ({ ...prev, main_artist_id: null, main_artist_name: query }));
    if (query.length < 2) {
      setTrackArtistSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/artists/?name_search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setTrackArtistSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateArtistForTrack = async (name: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/artists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        setEditForm(prev => ({ ...prev, main_artist_id: data.id, main_artist_name: data.name }));
        setTrackArtistSearchResults([]);
        toast.success(`新しいアーティスト「${name}」を作成しました`);
      } else {
        toast.error('アーティストの作成に失敗しました');
      }
    } catch(err) {
      console.error(err);
      toast.error('アーティストの作成に失敗しました');
    }
  };

  const handleOpenEditionModal = () => {
    if (!album) return;
    setEditionForm({
      version_title: album.version_title || '',
      album_group_id: albumGroup?.id || null,
      media_format: album.media_format || 'CD'
    });
    setAlbumGroupSearchQuery('');
    setAlbumGroupSearchResults([]);
    setIsEditionModalOpen(true);
  };

  const handleAlbumGroupSearch = async (query: string) => {
    setAlbumGroupSearchQuery(query);
    if (query.length < 2) {
      setAlbumGroupSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/album-groups/?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAlbumGroupSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditionSave = async () => {
    if (!album || !editionForm.album_group_id) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/albums/${album.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          version_title: editionForm.version_title,
          album_group_id: editionForm.album_group_id,
          media_format: editionForm.media_format
        })
      });
      if (!res.ok) throw new Error("Failed to update edition");
      
      toast.success('エディション情報を更新しました');
      setIsEditionModalOpen(false);
      
      // If moved to another group, redirect
      if (editionForm.album_group_id !== albumGroup?.id) {
        navigate(`/album-groups/${editionForm.album_group_id}`);
      } else {
        fetchAlbum();
      }
    } catch (err) {
      console.error(err);
      toast.error('エディションの更新に失敗しました');
    }
  };
  const handleGroupMergeSubmit = async () => {
    if (!groupMergeTargetId || groupMergeSourceIds.length === 0) return;
    setBulkMergeLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/album-groups/${albumGroup?.id}/merge-editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_album_id: groupMergeTargetId,
          source_album_ids: groupMergeSourceIds
        })
      });
      if (!res.ok) throw new Error('Group merge failed');
      const data = await res.json();
      if (data.skipped_count && data.skipped_count > 0) {
        toast.success(`${data.merged_count}曲を統合し、${data.skipped_count}曲はバージョン違い等のためスキップしました`, { duration: 5000 });
      } else {
        toast.success(`選択したエディションの統合が完了しました（${data.merged_count}曲）`);
      }
      setIsGroupMergeModalOpen(false);
      fetchAlbum();
    } catch (err) {
      console.error(err);
      toast.error('エラーが発生しました');
    } finally {
      setBulkMergeLoading(false);
    }
  };

  const handleBulkMergeSubmit = async () => {
    if (!bulkMergeSourceDisc || !bulkMergeTargetAlbumId) return;
    setBulkMergeLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/albums/${bulkMergeSourceDisc.albumId}/discs/${bulkMergeSourceDisc.discNumber}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_album_id: bulkMergeTargetAlbumId,
          target_disc_number: bulkMergeTargetDisc === '' ? null : bulkMergeTargetDisc
        })
      });
      if (!res.ok) throw new Error('Bulk merge failed');
      const data = await res.json();
      if (data.skipped_count && data.skipped_count > 0) {
        toast.success(`${data.merged_count}曲を統合し、${data.skipped_count}曲はバージョン違い等のためスキップしました`, { duration: 5000 });
      } else {
        toast.success(`ディスクの一括統合が完了しました（${data.merged_count}曲）`);
      }
      setIsBulkMergeModalOpen(false);
      fetchAlbum(); // Reload group to reflect merged tracks
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました。');
    } finally {
      setBulkMergeLoading(false);
    }
  };

  const handleEditionDelete = async () => {
    if (!album) return;
    if (!window.confirm(`このエディション（${album.version_title || '通常盤'}）を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/albums/${album.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete edition");
      
      toast.success('エディションを削除しました');
      setIsEditionModalOpen(false);
      
      // If the album group still has other albums, just reload it
      // Otherwise, the album group was deleted and we should go back
      if (albumGroup && albumGroup.albums && albumGroup.albums.length > 1) {
        fetchAlbum();
      } else {
        navigate('/albums'); // Go back to album list
      }
    } catch (err) {
      console.error(err);
      toast.error('エディションの削除に失敗しました');
    }
  };

  if (loading) return <LoadingSpinner fullPage message="アルバムデータを読み込んでいます..." />;
  if (!albumGroup) return <EmptyState title="アルバムが見つかりませんでした。" />;

  const releaseDate = albumGroup.release_date || '発売日不明';

  const groupedTracks = album?.album_tracks?.reduce((acc, track) => {
    const disc = track.disc_number || 1;
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(track);
    return acc;
  }, {} as Record<number, typeof album.album_tracks>) || {};

  const uniqueDiscs = Object.keys(groupedTracks).map(Number).sort((a, b) => a - b);
  const isDigital = album?.discs?.every(d => ['DIGITAL', 'STREAMING', 'Digital Media'].includes(d.media_format || ''));
  const isSingleDiscNoTitle = 
    uniqueDiscs.length === 1 && 
    (!album?.discs || album.discs.length === 0 || !album.discs[0].title);

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', marginBottom: '32px', fontSize: '1rem',
          padding: 0
        }}
      >
        <ArrowLeft size={20} />
        戻る
      </button>

      {/* ヘッダーエリア */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '48px', alignItems: 'flex-start' }}>
        {albumGroup.cover_image_url || album?.cover_image_url ? (
          <img 
            src={albumGroup.cover_image_url || album?.cover_image_url} 
            alt={albumGroup.title} 
            style={{ 
              width: '280px', height: '280px', 
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              flexShrink: 0
            }} 
          />
        ) : (
          <FallbackCoverDetail title={albumGroup.title} size={280} />
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <span style={{ 
            fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', 
            color: 'var(--text-secondary)', letterSpacing: '0.1em'
          }}>
            {albumGroup.album_type === 'single' ? 'Single' : albumGroup.album_type === 'dvd' ? 'Video' : 'Album'}
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {albumGroup.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {albumGroup.albums && albumGroup.albums.length > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {sortedAlbums.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlbumId(a.id)}
                    style={{
                      background: selectedAlbumId === a.id ? 'var(--text-primary)' : 'var(--bg-secondary)',
                      color: selectedAlbumId === a.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${selectedAlbumId === a.id ? 'var(--text-primary)' : 'var(--border-color)'}`,
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontSize: '0.95rem',
                      fontWeight: selectedAlbumId === a.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedAlbumId === a.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {a.version_title || '通常盤'}
                  </button>
                ))}
              </div>
            ) : (
              (album?.version_title && album.version_title !== '通常盤') ? (
                <div style={{ display: 'inline-block', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: '20px', padding: '6px 16px', fontSize: '0.95rem', fontWeight: 700 }}>
                  {album.version_title}
                </div>
              ) : null
            )}
            
            {/* 外部リンク（ストア等）プレースホルダー */}
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', textDecoration: 'none', marginLeft: '8px', border: '1px solid var(--border-color)' }}
              title="ストアを開く (Coming Soon)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            {album && (
              <button 
                onClick={handleOpenEditionModal} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '50%' }}
                title="エディション情報を編集"
              >
                <Edit2 size={18} />
              </button>
            )}
            {albumGroup.albums && albumGroup.albums.length > 1 && (
              <button
                onClick={() => setIsGroupMergeModalOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '20px', marginLeft: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                title="複数のエディションを一括で統合"
              >
                <GitMerge size={16} /> 複数統合
              </button>
            )}
          </div>
          
          <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isEditingArtist ? (
              <>
                {albumGroup.artist ? (
                  <Link to={`/artists/${albumGroup.artist.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {albumGroup.artist.name}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>アーティスト未設定</span>
                )}
                <button onClick={() => setIsEditingArtist(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                  <Edit2 size={16} />
                </button>
              </>
            ) : (
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={artistSearchQuery}
                    onChange={(e) => handleArtistSearch(e.target.value)}
                    placeholder="アーティスト名で検索..."
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                  <button onClick={() => setIsEditingArtist(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </div>
                {artistSearchResults.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', listStyle: 'none', padding: 0, margin: '4px 0', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    {artistSearchResults.map(a => (
                      <li key={a.id} onClick={() => handleSaveArtist(a.id)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        {a.name}
                      </li>
                    ))}
                    {artistSearchQuery.length >= 2 && !artistSearchResults.find(a => a.name.toLowerCase() === artistSearchQuery.toLowerCase()) && (
                      <li onClick={() => handleCreateArtistForAlbum(artistSearchQuery)} style={{ padding: '10px 12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>
                        + 「{artistSearchQuery}」を新しく追加
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
          
          {album?.spotify_album_id && (
            <a href={`https://open.spotify.com/album/${album.spotify_album_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--spotify-color, #1DB954)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', padding: '10px 16px', borderRadius: '20px', marginBottom: '16px', width: 'fit-content', boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(29, 185, 84, 0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 185, 84, 0.3)'; }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z" />
              </svg>
              Spotifyで聴く
            </a>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* <Calendar size={18} /> */}
              {releaseDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Disc3 size={18} />
              {album?.album_tracks?.length || 0} Tracks
            </span>
          </div>
        </div>
      </div>

      {/* トラックリスト */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
            収録曲
          </h2>
          {uniqueDiscs.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jump to:</span>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {uniqueDiscs.map(discNum => (
                  <a 
                    key={discNum} 
                    href={`#disc-${discNum}`} 
                    style={{ 
                      fontSize: '0.85rem', padding: '4px 10px', 
                      background: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
                      borderRadius: '12px', textDecoration: 'none', fontWeight: 600,
                      border: '1px solid var(--border-color)', whiteSpace: 'nowrap'
                    }}
                  >
                    Disc {discNum}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Discごとにグループ化して表示 */}
        {uniqueDiscs.map((discNum) => {
          const tracks = groupedTracks[discNum];
          
          return (
            <div key={discNum} id={`disc-${discNum}`} style={{ marginBottom: '32px', scrollMarginTop: '80px' }}>
              {(!isSingleDiscNoTitle && !isDigital) && (
                <h3 style={{ 
                  margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-color)', paddingBottom: '8px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {(() => {
                    const discData = album?.discs?.find(d => d.disc_number === discNum);
                    const formatStr = discData?.media_format && discData.media_format !== 'CD' ? ` (${discData.media_format})` : '';
                    const icon = discData?.media_format && discData.media_format !== 'CD' ? '📺' : '💿';
                    return (
                      <>
                        {editingDiscId === discData?.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <input 
                              type="text" 
                              value={discTitleForm}
                              onChange={(e) => setDiscTitleForm(e.target.value)}
                              placeholder="ディスク名を入力..."
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', width: '200px', fontSize: '0.9rem' }}
                            />
                            <button onClick={() => handleSaveDiscTitle(discData!.id)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingDiscId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            {discData?.title ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{icon} Disc {discNum}{formatStr}</span>
                                <span style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 700, marginTop: '2px' }}>{discData.title}</span>
                              </div>
                            ) : (
                              <span>{icon} Disc {discNum}{formatStr}</span>
                            )}
                            {discData?.edition && (
                              <span style={{ 
                                fontSize: '0.75rem', backgroundColor: 'var(--accent-primary)', 
                                color: '#000', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px',
                                fontWeight: 'bold'
                              }}>
                                {discData.edition}
                              </span>
                            )}
                            <button 
                              onClick={() => {
                                setBulkMergeSourceDisc({albumId: album!.id, discNumber: discNum, title: discData?.title || null});
                                setIsBulkMergeModalOpen(true);
                              }} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', marginLeft: 'auto', padding: '4px' }} 
                              title="ディスクの一括統合 (開発者用)"
                            >
                              <GitMerge size={16} />
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}
                </h3>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tracks.sort((a, b) => a.track_number - b.track_number).map((track) => {
                  // 映像フォーマット（Blu-ray/DVD）か、曲自体が映像フラグを持っている場合はサブスク未解禁フラグを出さない
                  const isVideoTrack = track.song.is_video || (track.media_format && ['Blu-ray', 'DVD'].includes(track.media_format));
                  const isUnreleased = !isVideoTrack && (track.song.spotify_song_id === null || track.song.is_streaming_available === false || track.is_unreleased === true);
                  
                  return (
                    <div key={track.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', backgroundColor: isUnreleased ? 'rgba(255,255,255,0.02)' : 'var(--bg-secondary)', 
                        borderRadius: '8px', transition: 'background-color 0.2s',
                        border: 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                          <div style={{ color: 'var(--text-tertiary)', fontWeight: 600, width: '24px', textAlign: 'right' }}>
                            {track.track_number}
                          </div>
                          
                          {editingTrackId === track.id ? (
                            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column' }} onClick={(e) => e.preventDefault()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', width: '80px' }}>マスター楽曲:</span>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input 
                                    type="text"
                                    value={editForm.song_title}
                                    onChange={(e) => handleSongSearch(e.target.value)}
                                    placeholder="検索..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                  />
                                  {songSearchResults.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                                      {songSearchResults.map(s => (
                                        <div 
                                          key={s.id} 
                                          onClick={() => {
                                            setEditForm(prev => ({ ...prev, song_id: s.id, song_title: s.title }));
                                            setSongSearchResults([]);
                                          }}
                                          style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          {s.title}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', width: '80px' }}>アルバム表記:</span>
                                <input 
                                  type="text"
                                  value={editForm.display_title}
                                  onChange={(e) => setEditForm({ ...editForm, display_title: e.target.value })}
                                  placeholder={`(空の場合はマスター「${track.song.title}」を表示)`}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                />
                                <input 
                                  type="text"
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  placeholder="備考(例: Live)"
                                  style={{ width: '120px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', width: '80px' }}>アーティスト:</span>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input 
                                    type="text"
                                    value={editForm.main_artist_name}
                                    onChange={(e) => handleTrackArtistSearch(e.target.value)}
                                    placeholder="メインアーティストを変更 (任意)"
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                  />
                                  {editForm.main_artist_id === null && (trackArtistSearchResults.length > 0 || editForm.main_artist_name.length >= 2) && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                      {trackArtistSearchResults.map(a => (
                                        <div 
                                          key={a.id} 
                                          onClick={() => {
                                            setEditForm(prev => ({ ...prev, main_artist_id: a.id, main_artist_name: a.name }));
                                            setTrackArtistSearchResults([]);
                                          }}
                                          style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          {a.name}
                                        </div>
                                      ))}
                                      {editForm.main_artist_name.length >= 2 && !trackArtistSearchResults.find(a => a.name.toLowerCase() === editForm.main_artist_name.toLowerCase()) && (
                                        <div 
                                          onClick={() => handleCreateArtistForTrack(editForm.main_artist_name)}
                                          style={{ padding: '8px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          + 「{editForm.main_artist_name}」を新しく追加
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingLeft: '88px', justifyContent: 'space-between' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox"
                                    checked={editForm.is_unreleased}
                                    onChange={(e) => setEditForm({ ...editForm, is_unreleased: e.target.checked })}
                                  />
                                  このトラック（バージョン）はサブスク未解禁とする
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <Button variant="primary" icon={Save} onClick={(e) => handleSaveTrack(e, track)}>保存</Button>
                                  <Button variant="secondary" icon={X} onClick={handleCancelEdit}>キャンセル</Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontWeight: 500, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <Link to={`/songs/${track.song_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                {track.display_title || track.song.title}
                              </Link>
                              {isUnreleased && (
                                <span style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                  padding: '2px 6px', borderRadius: '4px'
                                }}>
                                  <AlertCircle size={12} />
                                  サブスク未解禁
                                </span>
                              )}
                              {track.media_format && track.media_format !== 'CD' && (
                                <span style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  fontSize: '0.75rem', backgroundColor: 'rgba(29, 185, 84, 0.1)', color: 'var(--spotify-color)',
                                  padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(29, 185, 84, 0.3)', flexShrink: 0, whiteSpace: 'nowrap'
                                }}>
                                  📺 {track.media_format}
                                </span>
                              )}
                              {track.notes && (
                                <span style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                  padding: '2px 6px', borderRadius: '4px'
                                }}>
                                  {track.notes}
                                </span>
                              )}
                              {track.song.track_category && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.7rem', color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)', borderRadius: '12px',
                                  padding: '1px 8px', marginLeft: 'auto', textTransform: 'lowercase',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {track.song.track_category}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {editingTrackId !== track.id && (
                          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {track.duration_ms && (
                              <span style={{ width: '48px', textAlign: 'right' }}>
                                {formatTime(track.duration_ms)}
                              </span>
                            )}
                            <Button 
                              variant="ghost" 
                              onClick={(e) => handleEditClick(e, track)}
                            >
                              <Edit2 size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {album?.album_tracks?.length === 0 && (
          <EmptyState title="収録曲が登録されていません" />
        )}
      </div>
      {isEditionModalOpen && album && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>エディション情報の編集</h2>
              <button onClick={() => setIsEditionModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>バージョン名 (Edition Name)</label>
                <input 
                  type="text" 
                  value={editionForm.version_title}
                  onChange={(e) => setEditionForm({...editionForm, version_title: e.target.value})}
                  placeholder="例: 初回限定盤A (CD+DVD)"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>メディアフォーマット (Media Format)</label>
                <select
                  value={editionForm.media_format}
                  onChange={(e) => setEditionForm({...editionForm, media_format: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                >
                  <option value="CD">CD (Physical)</option>
                  <option value="Digital">Digital (配信 / Streaming)</option>
                  <option value="Vinyl">Vinyl (アナログ盤)</option>
                  <option value="Cassette">Cassette (カセット)</option>
                  <option value="DVD/BD">DVD / Blu-ray</option>
                  <option value="Other">Other (その他)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>所属アルバムグループ (統合先)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={albumGroupSearchQuery}
                    onChange={(e) => handleAlbumGroupSearch(e.target.value)}
                    placeholder="アルバム名を検索して移動..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                  />
                  {albumGroupSearchResults.length > 0 && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', listStyle: 'none', padding: 0, margin: '8px 0', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
                      {albumGroupSearchResults.map(ag => (
                        <li 
                          key={ag.id} 
                          onClick={() => {
                            setEditionForm({...editionForm, album_group_id: ag.id});
                            setAlbumGroupSearchQuery(`${ag.title} (${ag.artist?.name || '不明'})`);
                            setAlbumGroupSearchResults([]);
                          }} 
                          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
                        >
                          <span style={{ fontWeight: 600 }}>{ag.title}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ag.artist?.name || 'アーティスト不明'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {editionForm.album_group_id && editionForm.album_group_id !== albumGroup?.id && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,165,0,0.1)', borderLeft: '4px solid orange', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom', color: 'orange' }} />
                    保存すると、このエディションは別のアルバムグループへ移動します。
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
              <button 
                onClick={handleEditionDelete}
                style={{ 
                  background: 'none', border: '1px solid var(--danger-color)', color: 'var(--danger-color)',
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                このエディションを削除
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button onClick={() => setIsEditionModalOpen(false)} variant="secondary">キャンセル</Button>
                <Button onClick={handleEditionSave} variant="primary">保存する</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkMergeModalOpen && bulkMergeSourceDisc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitMerge size={24} /> ディスクの一括統合
              </h2>
              <button onClick={() => setIsBulkMergeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              このディスク（Disc {bulkMergeSourceDisc.discNumber}）のすべての楽曲を、別エディションの指定ディスクに一括で統合します。<br />
              <b>※元の楽曲データは削除され、取り消しできません。</b>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>統合先のエディション (Target Edition)</label>
                <select 
                  value={bulkMergeTargetAlbumId || ''} 
                  onChange={(e) => setBulkMergeTargetAlbumId(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                >
                  <option value="">選択してください...</option>
                  {albumGroup?.albums.filter(a => a.id !== bulkMergeSourceDisc.albumId).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.version_title || '通常盤'}
                    </option>
                  ))}
                </select>
              </div>
              {bulkMergeTargetAlbumId && albumGroup?.albums.find(a => a.id === bulkMergeTargetAlbumId)?.media_format !== "Digital" && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>統合先のディスク番号 (Target Disc)</label>
                  <select 
                    value={bulkMergeTargetDisc} 
                    onChange={(e) => setBulkMergeTargetDisc(Number(e.target.value))}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                  >
                    <option value="">自動マッチング (指定なし)</option>
                    {albumGroup?.albums.find(a => a.id === bulkMergeTargetAlbumId)?.discs?.map(d => (
                      <option key={d.id} value={d.disc_number}>
                        Disc {d.disc_number} {d.title ? `(${d.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <Button onClick={() => setIsBulkMergeModalOpen(false)} variant="secondary" disabled={bulkMergeLoading}>キャンセル</Button>
              <Button 
                onClick={handleBulkMergeSubmit} 
                variant="primary" 
                disabled={!bulkMergeTargetAlbumId || bulkMergeLoading}
                style={{ backgroundColor: 'var(--danger-color)' }}
              >
                {bulkMergeLoading ? '統合中...' : '一括統合を実行'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isGroupMergeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitMerge size={24} /> 複数エディションの一括統合
              </h2>
              <button onClick={() => setIsGroupMergeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              選択した複数のエディション（統合元）の全楽曲を、マスターエディション（統合先）に一括で統合します。<br />
              ディスク番号とトラック番号が一致する楽曲のみがマージされ、マスターに存在しない特典ディスク等は安全にスキップされます。<br />
              <b>※この操作は取り消しできません。</b>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>1. 統合先（マスターエディション）を選択</label>
                <select 
                  value={groupMergeTargetId || ''} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGroupMergeTargetId(val);
                    // 統合先として選んだものは、統合元リストから外す
                    setGroupMergeSourceIds(prev => prev.filter(id => id !== val));
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                >
                  <option value="">マスターエディションを選択してください...</option>
                  {sortedAlbums.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.version_title || '通常盤'}
                    </option>
                  ))}
                </select>
              </div>

              {groupMergeTargetId && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>2. 統合元（マスターへ吸収させるエディション）を選択</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto' }}>
                    {sortedAlbums.filter(a => a.id !== groupMergeTargetId).map(a => {
                      const targetAlbum = sortedAlbums.find(ta => ta.id === groupMergeTargetId);
                      let isMerged = false;
                      if (targetAlbum && a.album_tracks.length > 0) {
                        const targetSongIds = new Set(targetAlbum.album_tracks.map(t => t.song_id));
                        isMerged = a.album_tracks.every(t => targetSongIds.has(t.song_id));
                      }
                      return (
                      <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: groupMergeSourceIds.includes(a.id) ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                        <input 
                          type="checkbox" 
                          checked={groupMergeSourceIds.includes(a.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGroupMergeSourceIds([...groupMergeSourceIds, a.id]);
                            } else {
                              setGroupMergeSourceIds(groupMergeSourceIds.filter(id => id !== a.id));
                            }
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: '0.95rem' }}>
                          {a.version_title || '通常盤'}
                          {isMerged && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '2px 6px', borderRadius: '12px' }}>統合済</span>}
                        </span>
                      </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <Button onClick={() => setIsGroupMergeModalOpen(false)} variant="secondary" disabled={bulkMergeLoading}>キャンセル</Button>
              <Button 
                onClick={handleGroupMergeSubmit} 
                variant="primary" 
                disabled={!groupMergeTargetId || groupMergeSourceIds.length === 0 || bulkMergeLoading}
                style={{ backgroundColor: 'var(--danger-color)' }}
              >
                {bulkMergeLoading ? '統合中...' : '一括統合を実行'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumGroupDetail;
