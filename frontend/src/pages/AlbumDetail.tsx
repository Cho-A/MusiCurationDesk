import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Calendar, AlertCircle, Edit2, Save, X } from 'lucide-react';

interface SongMini {
  id: number;
  title: string;
  spotify_song_id?: string | null;
  is_video?: boolean;
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
  is_saved: boolean;
  discs: AlbumDisc[];
  album_tracks: AlbumTrack[];
}

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{display_title: string, notes: string, song_id: number | null, song_title: string, is_unreleased: boolean}>({ display_title: '', notes: '', song_id: null, song_title: '', is_unreleased: false });
  const [songSearchResults, setSongSearchResults] = useState<SongMini[]>([]);
  const [isSearchingSong, setIsSearchingSong] = useState(false);

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
      } else {
        alert('保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('ネットワークエラーが発生しました');
    }
  };

  if (loading) return <div style={{ padding: '32px' }}>読み込み中...</div>;
  if (!album) return <div style={{ padding: '32px' }}>アルバムが見つかりませんでした。</div>;

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
        <div style={{ 
          width: '280px', height: '280px', 
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '12px',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {album.cover_image_url ? (
            <img src={album.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Disc3 size={80} color="var(--text-tertiary)" />
          )}
        </div>
        
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} />
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
                  const isUnreleased = !isVideoTrack && track.song.spotify_song_id === null;
                  
                  return (
                    <Link key={track.id} to={`/songs/${track.song_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', backgroundColor: isUnreleased ? 'rgba(255,255,255,0.02)' : 'var(--bg-secondary)', 
                        borderRadius: '8px', transition: 'background-color 0.2s',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isUnreleased ? 'rgba(255,255,255,0.05)' : 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnreleased ? 'rgba(255,255,255,0.02)' : 'var(--bg-secondary)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                          <div style={{ color: 'var(--text-tertiary)', fontWeight: 600, width: '24px', textAlign: 'right' }}>
                            {track.track_number}
                          </div>
                          
                          {editingTrackId === track.id ? (
                            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column' }} onClick={(e) => e.preventDefault()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ color: '#aaa', fontSize: '0.85rem', width: '80px' }}>マスター楽曲:</span>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input 
                                    type="text"
                                    value={editForm.song_title}
                                    onChange={(e) => handleSongSearch(e.target.value)}
                                    placeholder="検索..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}
                                  />
                                  {songSearchResults.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#222', border: '1px solid #444', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                                      {songSearchResults.map(s => (
                                        <div 
                                          key={s.id} 
                                          onClick={() => {
                                            setEditForm(prev => ({ ...prev, song_id: s.id, song_title: s.title }));
                                            setSongSearchResults([]);
                                          }}
                                          style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #333' }}
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
                                <span style={{ color: '#aaa', fontSize: '0.85rem', width: '80px' }}>アルバム表記:</span>
                                <input 
                                  type="text"
                                  value={editForm.display_title}
                                  onChange={(e) => setEditForm({ ...editForm, display_title: e.target.value })}
                                  placeholder={`(空の場合はマスター「${track.song.title}」を表示)`}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                />
                                <input 
                                  type="text"
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  placeholder="備考(例: Live)"
                                  style={{ width: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingLeft: '88px', justifyContent: 'space-between' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#ccc', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox"
                                    checked={editForm.is_unreleased}
                                    onChange={(e) => setEditForm({ ...editForm, is_unreleased: e.target.checked })}
                                  />
                                  このトラック（バージョン）はサブスク未解禁とする
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={(e) => handleSaveTrack(e, track)} style={{ background: '#1DB954', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}><Save size={16} /> 保存</button>
                                  <button onClick={handleCancelEdit} style={{ background: 'transparent', color: '#fff', border: '1px solid #555', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><X size={16} /> キャンセル</button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontWeight: 500, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {track.display_title || track.song.title}
                              {isUnreleased && (
                                <span style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  fontSize: '0.75rem', backgroundColor: '#333', color: '#aaa',
                                  padding: '2px 6px', borderRadius: '4px'
                                }}>
                                  <AlertCircle size={12} />
                                  サブスク未解禁
                                </span>
                              )}
                              {track.media_format && track.media_format !== 'CD' && (
                                <span style={{ 
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  fontSize: '0.75rem', backgroundColor: 'rgba(29, 185, 84, 0.1)', color: '#1DB954',
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
                            <button 
                              onClick={(e) => handleEditClick(e, track)} 
                              style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="トラック名の編集"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        {album.album_tracks.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            収録曲が登録されていません
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumDetail;
