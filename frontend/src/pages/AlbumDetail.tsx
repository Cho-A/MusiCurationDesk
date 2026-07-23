import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigationHistory } from '../context/NavigationHistoryContext';
import { ArrowLeft, Disc3, AlertCircle, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';

interface SongMini {
  id: number;
  title: string;
  spotify_song_id?: string | null;
  is_video?: boolean;
  version_name?: string;
  is_streaming_available?: boolean;
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

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { goBack } = useNavigationHistory();
  const [album, setAlbum] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{display_title: string, notes: string, song_id: number | null, song_title: string, is_unreleased: boolean}>({ display_title: '', notes: '', song_id: null, song_title: '', is_unreleased: false });
  const [songSearchResults, setSongSearchResults] = useState<SongMini[]>([]);
  const [, setIsSearchingSong] = useState(false);

  const formatTime = (ms: number) => {
    return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  };

  const fetchAlbum = useCallback(() => {
    fetch(`http://127.0.0.1:8000/albums/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Album not found");
        return res.json();
      })
      .then(data => {
        setAlbum(data);
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

  useEffect(() => {
    if (!loading && album && window.location.hash) {
      const element = document.getElementById(window.location.hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loading, album]);

  const handleEditClick = (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTrackId(track.id);
    setEditForm({
      display_title: track.display_title || '',
      notes: track.notes || '',
      song_id: track.song.id,
      song_title: track.song.title,
      is_unreleased: track.is_unreleased || false
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

  const handleSaveTrack = async (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`http://127.0.0.1:8000/albums/${id}/tracks/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_title: editForm.display_title || null,
          notes: editForm.notes || null,
          song_id: editForm.song_id,
          is_unreleased: editForm.is_unreleased
        })
      });
      if (res.ok) {
        fetchAlbum();
        setEditingTrackId(null);
        toast.success('トラック情報を更新しました');
      } else {
        toast.error('保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
      toast.error('ネットワークエラーが発生しました');
    }
  };

  if (loading) return <LoadingSpinner fullPage message="アルバムデータを読み込んでいます..." />;
  if (!album) return <EmptyState title="アルバムが見つかりませんでした。" />;

  const releaseDate = album.physical_release_date || album.digital_release_date || '発売日不明';

  const groupedTracks = album.album_tracks.reduce((acc, track) => {
    const disc = track.disc_number || 1;
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(track);
    return acc;
  }, {} as Record<number, typeof album.album_tracks>);

  const uniqueDiscs = Object.keys(groupedTracks).map(Number).sort((a, b) => a - b);
  const isSingleDiscNoTitle = 
    uniqueDiscs.length === 1 && 
    (!album.discs || album.discs.length === 0 || !album.discs[0].title);

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* 戻るボタン */}
      <button 
        onClick={() => goBack()}
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
        {album.spotify_album_id ? (
          <iframe 
            src={`https://open.spotify.com/embed/album/${album.spotify_album_id}`} 
            width="300" 
            height="380" 
            frameBorder="0" 
            allow="encrypted-media"
            style={{ borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', flexShrink: 0 }}
          ></iframe>
        ) : (
          <div style={{ 
            width: '280px', height: '280px', 
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '12px',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            flexShrink: 0
          }}>
            <Disc3 size={80} color="var(--text-tertiary)" />
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <span style={{ 
            fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', 
            color: 'var(--text-secondary)', letterSpacing: '0.1em'
          }}>
            {album.album_type === 'single' ? 'Single' : album.album_type === 'dvd' ? 'Video' : 'Album'}
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {album.main_title}
          </h1>
          {album.version_title && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--accent-primary)', margin: 0 }}>
              {album.version_title}
            </h2>
          )}
          
          {album.artist && (
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <Link to={`/artists/${album.artist.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                {album.artist.name}
              </Link>
            </div>
          )}
          
          {album.spotify_album_id && (
            <a href={`https://open.spotify.com/album/${album.spotify_album_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--spotify-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px', width: 'fit-content' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z" />
              </svg>
              Spotifyで開く
            </a>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* <Calendar size={18} /> */}
              {releaseDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Disc3 size={18} />
              {album.album_tracks.length} Tracks
            </span>
          </div>
        </div>
      </div>

      {/* トラックリスト */}
      <div>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>
          収録曲
        </h2>
        
        {/* Discごとにグループ化して表示 */}
        {uniqueDiscs.map((discNum) => {
          const tracks = groupedTracks[discNum];
          
          return (
            <div key={discNum} id={`disc-${discNum}`} style={{ marginBottom: '32px', scrollMarginTop: '80px' }}>
              {!isSingleDiscNoTitle && (
                <h3 style={{ 
                  margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-color)', paddingBottom: '8px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {(() => {
                    const discInfo = album.discs?.find(d => d.disc_number === discNum);
                    const titleStr = discInfo?.title ? `: ${discInfo.title}` : '';
                    const formatStr = discInfo?.media_format && discInfo.media_format !== 'CD' ? ` (${discInfo.media_format})` : '';
                    const icon = discInfo?.media_format && discInfo.media_format !== 'CD' ? '📺' : '💿';
                    return (
                      <>
                        <span>{icon} Disc {discNum}{titleStr}{formatStr}</span>
                        {discInfo?.edition && (
                          <span style={{ 
                            fontSize: '0.75rem', backgroundColor: 'var(--accent-primary)', 
                            color: '#000', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px',
                            fontWeight: 'bold'
                          }}>
                            {discInfo.edition}
                          </span>
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
                  const isUnreleased = !isVideoTrack && (track.song.spotify_song_id === null || track.song.is_streaming_available === false);
                  
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
                                  fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ddd',
                                  padding: '2px 6px', borderRadius: '4px'
                                }}>
                                  {track.notes}
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
        {album.album_tracks.length === 0 && (
          <EmptyState title="収録曲が登録されていません" />
        )}
      </div>
    </div>
  );
};

export default AlbumDetail;
