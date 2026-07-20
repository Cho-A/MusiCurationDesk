import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Disc3, Edit2, Check, X, Link as LinkIcon, Unlink } from 'lucide-react';
import SongCreditEditor from '../components/SongCreditEditor';
import SongTagEditor from '../components/SongTagEditor';
import AttachWorkModal from '../components/AttachWorkModal';

interface ArtistLink {
  artist_id: number;
  artist_name: string;
  role_category: string;
  role_detail?: string;
}

interface TieupLink {
  tieup_id: number;
  tieup_name: string;
  tieup_category: string;
  context?: string;
}

interface AlbumMini {
  id: number;
  main_title: string;
  version_title?: string;
  cover_image_url?: string;
}

interface AlbumTrackInfo {
  album_id: number;
  track_number: number;
  disc_number: number;
  duration_ms?: number;
  album: AlbumMini;
  song_title?: string;
}

interface TagData {
  id: number;
  name: string;
  color?: string;
  parent_id?: number;
}

interface SongDetailData {
  id: number;
  title: string;
  spotify_song_id?: string;
  artist_links: ArtistLink[];
  tieup_links: TieupLink[];
  album_links?: AlbumTrackInfo[];
  tags?: TagData[];
  other_versions?: { id: number; title: string }[];
  work_id?: number;
}

const SongDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<SongDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 編集モード用のステート
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  
  // モーダル用のステート
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  const fetchSong = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSong(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSong();
  }, [id]);

  const handleAddCredit = async (artistName: string, category: string, detail?: string) => {
    try {
      // 1. まずアーティストを探すか作成するAPIが必要だが、簡易版として一旦POSTする
      // (本来はArtist検索APIを叩いてIDを得るステップが必要)
      // 開発中につき、簡易的にアーティストを作成・取得するモック処理を想定
      alert(`クレジットを追加します: ${artistName} / ${category} / ${detail}`);
      
      // TODO: 実際のAPI呼び出し
      // const res = await fetch(`http://127.0.0.1:8000/songs/${id}/artists`, { ... });
      // fetchSong();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCredit = async (artistId: number, category: string, detail?: string) => {
    try {
      let url = `http://127.0.0.1:8000/songs/${id}/artists/${artistId}?role_category=${encodeURIComponent(category)}`;
      if (detail) url += `&role_detail=${encodeURIComponent(detail)}`;
      
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        fetchSong(); // 再取得してリストを更新
      } else {
        alert("クレジットの削除に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTitle = async () => {
    if (!editTitleValue.trim()) return;
    try {
      const payload = {
        title: editTitleValue,
        // 他の必須フィールドがある場合はsongオブジェクトから補完する。
        // PUTエンドポイントはSongCreateスキーマを要求する。
        spotify_song_id: song?.spotify_song_id || null
      };
      const res = await fetch(`http://127.0.0.1:8000/songs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEditingTitle(false);
        fetchSong();
      } else {
        alert("タイトルの更新に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDetachWork = async () => {
    if (!window.confirm("この音源を現在の作品から切り離し、独立した新しい作品として登録しますか？")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${id}/detach`, { method: 'POST' });
      if (res.ok) {
        alert("切り離しが完了しました");
        fetchSong();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachWork = async (targetId: number) => {
    if (!window.confirm(`この音源を Work ID: ${targetId} に結合しますか？`)) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${id}/attach?target_work_id=${targetId}`, { method: 'POST' });
      if (res.ok) {
        alert("結合が完了しました");
        setIsAttachModalOpen(false);
        fetchSong();
      } else {
        alert("結合に失敗しました。対象のWork IDが存在しない可能性があります。");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '32px' }}>読み込み中...</div>;
  if (!song) return <div style={{ padding: '32px' }}>楽曲が見つかりません</div>;

  // クレジットのソートロジック
  const roleOrder = ['Artist', 'Composer', 'Lyricist', 'Producer', 'Arranger'];
  const sortedCredits = [...(song.artist_links || [])].sort((a, b) => {
    const indexA = roleOrder.indexOf(a.role_category);
    const indexB = roleOrder.indexOf(b.role_category);
    
    // 両方とも主要ロールの場合
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // aだけが主要ロールの場合
    if (indexA !== -1) return -1;
    // bだけが主要ロールの場合
    if (indexB !== -1) return 1;
    
    // どちらも主要ロールでない場合は、カテゴリ名でアルファベット順ソート (主観を排除)
    if (a.role_category < b.role_category) return -1;
    if (a.role_category > b.role_category) return 1;
    return 0;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* 戻るボタン */}
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

        {/* Header Section */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
          <div style={{ flex: 1 }}>
            
            {/* Title Editing UI */}
            {isEditingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  style={{
                    fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px', padding: '4px 12px', width: '100%', outline: 'none'
                  }}
                  autoFocus
                />
                <button onClick={handleUpdateTitle} style={{ background: '#1DB954', color: '#000', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                  <Check size={20} />
                </button>
                <button onClick={() => setIsEditingTitle(false)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 800, 
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  {song.title}
                </h1>
                <button 
                  onClick={() => { setEditTitleValue(song.title); setIsEditingTitle(true); }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  title="タイトル・バージョン名を編集"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem'
            }}>
              {/* Removed Spotify Badge as requested */}
            </div>
            <div style={{ marginTop: '16px' }}>
                <SongTagEditor 
                  songId={song.id} 
                  existingTags={song.tags || []} 
                  onTagsChange={(newTags) => setSong({...song, tags: newTags})} 
                />
            </div>
          </div>
        </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {/* クレジット */}
        <div>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
            クレジット
          </h2>
          <SongCreditEditor 
            songId={song.id} 
            existingCredits={sortedCredits} 
            onAddCredit={handleAddCredit}
            onRemoveCredit={handleRemoveCredit}
          />
        </div>

        {/* 収録アルバム */}
        <div>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
            収録アルバム
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(song.album_links || []).map((albumLink, idx) => (
              <Link key={idx} to={`/albums/${albumLink.album.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ 
                    width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {albumLink.album.cover_image_url ? (
                      <img src={albumLink.album.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Disc3 size={24} color="var(--text-secondary)" />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ 
                      fontWeight: 600, fontSize: '1.1rem', 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                    }}>
                      {albumLink.album.main_title}
                    </div>
                    {albumLink.song_title && albumLink.song_title !== song.title && (
                      <div style={{ fontSize: '0.85rem', color: '#1DB954', marginTop: '2px', fontWeight: 500 }}>
                        {albumLink.song_title}
                      </div>
                    )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Disc {albumLink.disc_number} - Track {albumLink.track_number}</span>
                    {albumLink.duration_ms && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {Math.floor(albumLink.duration_ms / 60000)}:{String(Math.floor((albumLink.duration_ms % 60000) / 1000)).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
            ))}
            {(!song.album_links || song.album_links.length === 0) && (
              <div style={{ color: 'var(--text-tertiary)' }}>収録アルバム情報はありません</div>
            )}
          </div>
        </div>

        {/* タイアップ */}
        <div>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
            タイアップ
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(song.tieup_links || []).map((tieup, idx) => (
              <Link key={idx} to={`/tieups/${tieup.tieup_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px',
                  transition: 'background 0.2s ease', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ fontSize: '0.8rem', color: '#1DB954', marginBottom: '4px' }}>
                    {tieup.tieup_category}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tieup.tieup_name}</div>
                  {tieup.context && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {tieup.context}
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {(!song.tieup_links || song.tieup_links.length === 0) && (
              <div style={{ color: 'var(--text-tertiary)' }}>タイアップ情報はありません</div>
            )}
          </div>
        </div>

        {/* Advanced Management (作品の関連付け管理) */}
        <div style={{ marginTop: '24px', padding: '24px', background: 'rgba(255,0,0,0.03)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#ff6b6b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Advanced Management
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            現在の作品(Work) ID: <strong>{song.work_id || '未設定'}</strong>
            <br />
            同名異曲の分離や、別バージョンの手動統合を行います。
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={handleDetachWork}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b',
                border: '1px solid rgba(255,107,107,0.2)', cursor: 'pointer', fontWeight: 600
              }}
            >
              <Unlink size={16} />
              独立した作品として切り離す (Detach)
            </button>
            <button 
              onClick={() => setIsAttachModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600
              }}
            >
              <LinkIcon size={16} />
              他の作品に統合する (Merge)
            </button>
          </div>
        </div>

      </div>

      <AttachWorkModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        currentSong={song}
        onAttach={handleAttachWork}
      />
    </div>
  );
};

export default SongDetail;
