import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Edit2, Link as LinkIcon, Unlink, Music, Video, ListMusic, Check, Film } from 'lucide-react';
import SongCreditEditor from '../components/SongCreditEditor';
import SongTagEditor from '../components/SongTagEditor';
import AttachWorkModal from '../components/AttachWorkModal';
import MergeSongModal from '../components/MergeSongModal';

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
  song_id?: number;
  is_video?: boolean;
  display_title?: string;
  version_name?: string;
  is_streaming_available?: boolean;
}

interface TagData {
  id: number;
  name: string;
  color?: string;
  parent_id?: number;
}

interface WorkArtistLink {
  artist_id: number;
  artist_name: string;
  role_category: string;
  role_detail?: string;
}

interface OtherVersion {
  id: number;
  title: string;
  is_video?: boolean;
  version_name?: string;
  is_streaming_available?: boolean;
  spotify_song_title?: string;
  album_links?: AlbumTrackInfo[]; // 実際のAPIではother_versionsにはalbum_linksが含まれないかもしれない。必要ならAPI改修が必要。
}

interface SongDetailData {
  id: number;
  title: string;
  is_video: boolean;
  version_name?: string;
  is_streaming_available?: boolean;
  spotify_song_title?: string;
  jasrac_code?: string;
  artist_links: ArtistLink[];
  tieup_links: TieupLink[];
  album_links?: AlbumTrackInfo[];
  tags?: TagData[];
  other_versions?: OtherVersion[];
  work_id?: number;
  work?: { 
    id: number; 
    title: string;
    artist_links: WorkArtistLink[];
  };
}

const SongDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Base data fetched from API
  const [baseSong, setBaseSong] = useState<SongDetailData | null>(null);
  
  // 状態管理によるハブの実現
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'audio' | 'video'>('audio');
  
  // アルバム表示のトグル
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  const [loading, setLoading] = useState(true);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [editVersionNameValue, setEditVersionNameValue] = useState("");
  const [editStreamingValue, setEditStreamingValue] = useState(true);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const fetchBaseSong = async (songIdToFetch: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${songIdToFetch}`);
      if (res.ok) {
        const data = await res.json();
        setBaseSong(data);
        // fetch完了時に、初期選択としてこの曲のIDをセット
        setSelectedVersionId(Number(songIdToFetch));
        setActiveCategory(data.is_video ? 'video' : 'audio');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBaseSong(id);
  }, [id]);

  // Handle switching tabs
  const handleVersionSelect = async (versionId: number) => {
    if (versionId === selectedVersionId) return;
    
    // We need to fetch the full details for the selected version because `other_versions` 
    // doesn't contain credits and tie-ups for those versions.
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${versionId}`);
      if (res.ok) {
        const data = await res.json();
        setBaseSong(data);
        setSelectedVersionId(versionId);
        setActiveCategory(data.is_video ? 'video' : 'audio');
        // URLは変えない（ブラウザバック時の挙動を維持しつつ、ハブとしての体験を向上）
        // history.replaceState(null, '', `/songs/${versionId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCredit = async (artistName: string, category: string, detail?: string) => {
    alert(`クレジットを追加します: ${artistName} / ${category} / ${detail}`);
  };

  const handleRemoveCredit = async (artistId: number, category: string, detail?: string) => {
    try {
      let url = `http://127.0.0.1:8000/songs/${selectedVersionId}/artists/${artistId}?role_category=${encodeURIComponent(category)}`;
      if (detail) url += `&role_detail=${encodeURIComponent(detail)}`;
      
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (selectedVersionId) handleVersionSelect(selectedVersionId);
      } else {
        alert("クレジットの削除に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleIsVideo = async () => {
    if (!baseSong) return;
    const nextVal = !baseSong.is_video;
    if (!window.confirm(`このバージョンを「${nextVal ? '映像' : '音源'}」に変更しますか？`)) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_video: nextVal })
      });
      if (res.ok) {
        if (selectedVersionId) handleVersionSelect(selectedVersionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDetachWork = async () => {
    if (!window.confirm("このバージョンを現在の作品から切り離し、独立した新しい作品として登録しますか？")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/detach`, { method: 'POST' });
      if (res.ok) {
        alert("切り離しが完了しました");
        if (selectedVersionId) handleVersionSelect(selectedVersionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachWork = async (targetId: number) => {
    if (!window.confirm(`このバージョンを Work ID: ${targetId} に結合しますか？`)) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/attach?target_work_id=${targetId}`, { method: 'POST' });
      if (res.ok) {
        alert("結合が完了しました");
        setIsAttachModalOpen(false);
        if (selectedVersionId) handleVersionSelect(selectedVersionId);
      } else {
        alert("結合に失敗しました。対象のWork IDが存在しない可能性があります。");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMergeSong = async (targetId: number) => {
    if (isNaN(targetId) || targetId === selectedVersionId) {
      alert("無効なIDです。");
      return;
    }
    
    if (!window.confirm(`本当にこのバージョンを ID: ${targetId} に統合してよろしいですか？`)) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/merge?target_song_id=${targetId}`, { method: 'POST' });
      if (res.ok) {
        alert("統合が完了しました");
        setIsMergeModalOpen(false);
        // 統合先へ移動
        window.location.href = `/songs/${targetId}`;
      } else {
        alert("統合に失敗しました。対象のバージョンIDが存在しない可能性があります。");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '32px' }}>読み込み中...</div>;
  if (!baseSong) return <div style={{ padding: '32px' }}>楽曲が見つかりません。</div>;

  // バージョンの整理
  const allVersions = [baseSong, ...(baseSong.other_versions || [])].sort((a, b) => a.id - b.id);
  // 重複排除 (baseSongがother_versionsに含まれて返ってくるAPI実装に対応するため)
  const uniqueVersionsMap = new Map();
  allVersions.forEach(v => uniqueVersionsMap.set(v.id, v));
  const uniqueVersions = Array.from(uniqueVersionsMap.values());

  const audioVersions = uniqueVersions.filter(v => !v.is_video);
  const videoVersions = uniqueVersions.filter(v => v.is_video);

  const handleCategorySwitch = (cat: 'audio' | 'video') => {
    setActiveCategory(cat);
    const targetList = cat === 'audio' ? audioVersions : videoVersions;
    if (targetList.length > 0 && !targetList.find(v => v.id === selectedVersionId)) {
      handleVersionSelect(targetList[0].id);
    }
  };

  // クレジットのソートロジック
  const roleOrder = ['Artist', 'Composer', 'Lyricist', 'Producer', 'Arranger'];
  const sortedCredits = [...(baseSong.artist_links || [])].sort((a, b) => {
    const indexA = roleOrder.indexOf(a.role_category);
    const indexB = roleOrder.indexOf(b.role_category);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    if (a.role_category < b.role_category) return -1;
    if (a.role_category > b.role_category) return 1;
    return 0;
  });

  // アルバム表示用のデータ作成
  let displayAlbums: AlbumTrackInfo[] = [];
  if (showAllAlbums) {
    displayAlbums = baseSong.album_links || [];
  } else {
    // Song IDで厳密にフィルタリング
    displayAlbums = (baseSong.album_links || []).filter(a => a.song_id === baseSong.id);
  }

  // Workクレジット
  const lyricists = (baseSong.work?.artist_links ?? []).filter(l => l.role_category === 'Lyricist').map(l => l.artist_name);
  const composers = (baseSong.work?.artist_links ?? []).filter(l => l.role_category === 'Composer').map(l => l.artist_name);

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

      {/* 楽曲 (Work) 固定ヘッダー */}
      <div style={{ 
        background: 'var(--bg-secondary)',
        padding: '32px', borderRadius: '16px', marginBottom: '32px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#1DB954', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em' }}>
          楽曲 (WORK)
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
          {baseSong.work?.title || baseSong.title}
        </h1>
        
        {/* 作詞・作曲クレジット */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-secondary)' }}>
          {lyricists.length > 0 && (
            <div>
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>作詞:</span>{' '}
              <span style={{ color: 'var(--text-primary)' }}>{lyricists.join(', ')}</span>
            </div>
          )}
          {composers.length > 0 && (
            <div>
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>作曲:</span>{' '}
              <span style={{ color: 'var(--text-primary)' }}>{composers.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* バージョン選択 (音源 / 映像 大タブ) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            disabled={audioVersions.length === 0}
            onClick={() => handleCategorySwitch('audio')}
            style={{
              padding: '12px 24px', background: 'none', border: 'none',
              color: activeCategory === 'audio' ? '#1DB954' : 'var(--text-secondary)',
              borderBottom: activeCategory === 'audio' ? '3px solid #1DB954' : '3px solid transparent',
              cursor: audioVersions.length > 0 ? 'pointer' : 'not-allowed', opacity: audioVersions.length > 0 ? 1 : 0.5,
              fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Music size={20} />
            音源 ({audioVersions.length})
          </button>
          <button 
            disabled={videoVersions.length === 0}
            onClick={() => handleCategorySwitch('video')}
            style={{
              padding: '12px 24px', background: 'none', border: 'none',
              color: activeCategory === 'video' ? '#ff4d4d' : 'var(--text-secondary)',
              borderBottom: activeCategory === 'video' ? '3px solid #ff4d4d' : '3px solid transparent',
              cursor: videoVersions.length > 0 ? 'pointer' : 'not-allowed', opacity: videoVersions.length > 0 ? 1 : 0.5,
              fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Video size={20} />
            映像 ({videoVersions.length})
          </button>
        </div>

        {/* バージョン サブタブ */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(activeCategory === 'audio' ? audioVersions : videoVersions).map(v => (
            <button
              key={v.id} 
              onClick={() => handleVersionSelect(v.id)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                background: v.id === selectedVersionId 
                  ? 'var(--accent-primary)' 
                  : 'var(--bg-tertiary)',
                color: v.id === selectedVersionId ? '#fff' : 'var(--text-secondary)',
                border: v.id === selectedVersionId ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.2s'
              }}
            >
              {v.title} {v.version_name ? `(${v.version_name})` : ''}
              {!v.is_video && v.is_streaming_available === false && (
                <span style={{color: '#ff4d4d', marginLeft: '6px', fontSize: '0.8em', border: '1px solid #ff4d4d', padding: '1px 4px', borderRadius: '4px'}}>
                  サブスク未解禁
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 以下、選択中のバージョンの詳細 (再レンダリング) */}
      <div style={{ 
        backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px', 
        border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '48px',
        boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.3s ease'
      }}>
        
        {/* バージョン基本情報 (編集など) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {baseSong.title}
                  {!baseSong.is_video && baseSong.is_streaming_available === false && (
                    <span style={{color: '#ff4d4d', fontSize: '0.9rem', border: '1px solid #ff4d4d', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'}}>
                      サブスク未解禁
                    </span>
                  )}
                </h2>
                <button 
                  onClick={() => { 
                    setEditTitleValue(baseSong.title); 
                    setEditVersionNameValue(baseSong.version_name || "");
                    setEditStreamingValue(baseSong.is_streaming_available !== false);
                    setIsEditingTitle(true); 
                  }}
                  style={{
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', cursor: 'pointer',
                    marginTop: '4px'
                  }}
                  title="バージョン名を編集"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              {baseSong.version_name && (
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '4px' }}>
                  {baseSong.version_name}
                </div>
              )}
            </div>
            
            {/* 種別変更トグル */}
            <button
              onClick={handleToggleIsVideo}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                borderColor: baseSong.is_video ? 'var(--accent-primary)' : 'var(--accent-primary)',
                background: 'var(--bg-tertiary)',
                color: baseSong.is_video ? '#ff4d4d' : '#1DB954',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto'
              }}
              title="クリックで音源/映像を切り替え"
            >
              {baseSong.is_video ? <Film size={14} /> : <Music size={14} />}
              種別: {baseSong.is_video ? '映像' : '音源'}
            </button>
          </div>
          
          {isEditingTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="曲名 (例: センチメンタルピリオド)"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                style={{
                  fontSize: '1rem', color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '4px', padding: '8px 12px', width: '250px', outline: 'none'
                }}
              />
              <input
                type="text"
                placeholder="バージョン名 (例: 2006 新世界ノート版)"
                value={editVersionNameValue}
                onChange={(e) => setEditVersionNameValue(e.target.value)}
                style={{
                  fontSize: '1rem', color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '4px', padding: '8px 12px', width: '250px', outline: 'none'
                }}
              />
              {!baseSong.is_video && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editStreamingValue} 
                    onChange={(e) => setEditStreamingValue(e.target.checked)}
                  />
                  サブスク解禁済
                </label>
              )}
              <button onClick={async () => {
                if (!editTitleValue.trim()) return;
                const payload = {
                  title: editTitleValue,
                  version_name: editVersionNameValue.trim() || null,
                  is_streaming_available: baseSong.is_video ? true : editStreamingValue
                };
                const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  setIsEditingTitle(false);
                  if (selectedVersionId) handleVersionSelect(selectedVersionId);
                }
              }} style={{ background: '#1DB954', color: '#000', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                保存
              </button>
              <button onClick={() => setIsEditingTitle(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                キャンセル
              </button>
            </div>
          )}

          <SongTagEditor 
            songId={baseSong.id} 
            existingTags={baseSong.tags || []} 
            onTagsChange={(newTags) => setBaseSong({...baseSong, tags: newTags})} 
          />
        </div>

        {/* クレジット (バージョンごと) */}
        <div>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
            バージョンごとのクレジット (編曲・演奏)
          </h3>
          <SongCreditEditor 
            songId={baseSong.id} 
            existingCredits={sortedCredits} 
            onAddCredit={handleAddCredit}
            onRemoveCredit={handleRemoveCredit}
          />
        </div>

        {/* 収録アルバム */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListMusic size={18} />
              収録アルバム
            </h3>
            
            {/* アルバム表示トグル */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '4px' }}>
              <button
                onClick={() => setShowAllAlbums(false)}
                style={{
                  padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: !showAllAlbums ? '#fff' : 'transparent',
                  color: !showAllAlbums ? '#000' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                このバージョン
              </button>
              <button
                onClick={() => setShowAllAlbums(true)}
                style={{
                  padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  background: showAllAlbums ? '#fff' : 'transparent',
                  color: showAllAlbums ? '#000' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                すべてのバージョン
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {displayAlbums.map((albumLink, idx) => (
              <Link key={`${albumLink.album.id}-${idx}`} to={`/albums/${albumLink.album.id}#disc-${albumLink.disc_number || 1}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ 
                    width: '48px', height: '48px', backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0
                  }}>
                    {albumLink.album.cover_image_url ? (
                      <img src={albumLink.album.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Disc3 size={24} color="var(--text-secondary)" />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {albumLink.album.main_title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>Disc {albumLink.disc_number} - Track {albumLink.track_number}</span>
                    </div>
                    {showAllAlbums && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: albumLink.is_video ? '#ff4d4d' : '#1DB954', marginTop: '4px', fontWeight: 600 }}>
                        {albumLink.is_video ? <Film size={12} /> : <Music size={12} />}
                        {albumLink.display_title || albumLink.song_title}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {displayAlbums.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)' }}>収録アルバム情報はありません。</div>
            )}
          </div>
        </div>

        {/* タイアップ */}
        <div>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
            タイアップ
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(baseSong.tieup_links || []).map((tieup, idx) => (
              <Link key={idx} to={`/tieups/${tieup.tieup_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px',
                  transition: 'background 0.2s ease', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ fontSize: '0.8rem', color: '#1DB954', marginBottom: '4px' }}>{tieup.tieup_category}</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tieup.tieup_name}</div>
                  {tieup.context && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{tieup.context}</div>}
                </div>
              </Link>
            ))}
            {(!baseSong.tieup_links || baseSong.tieup_links.length === 0) && (
              <p style={{ color: 'var(--text-secondary)' }}>タイアップ情報はありません。</p>
            )}
          </div>
        </div>

        {/* 高級管理（原曲との紐付け管理） */}
        <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: '#ff6b6b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            楽曲・原曲との紐付け管理
          </h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            現在の原曲 ID: <strong>{baseSong.work_id || '未設定'}</strong><br />
            <span style={{ fontSize: '0.85rem' }}>
              ※同名異曲を別の楽曲として独立させたり、誤って別々に登録されたバージョンを同じ原曲にまとめることができます。
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleDetachWork}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: '#ff6b6b',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
              }}
            >
              <Unlink size={14} />
              独立した作品として切り離す (Detach)
            </button>
            <button 
              onClick={() => setIsAttachModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
              }}
            >
              <LinkIcon size={14} />
              他の作品に統合する (Merge Work)
            </button>
            <button 
              onClick={() => setIsMergeModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: '#ffa500',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                marginLeft: 'auto'
              }}
              title="このバージョンを別のバージョンにマージして1つにまとめます"
            >
              <Check size={14} />
              他のバージョンと統合する (Merge Song)
            </button>
          </div>
        </div>

      </div>

      <AttachWorkModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        currentSong={baseSong}
        onAttach={handleAttachWork}
      />

      <MergeSongModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        currentSong={baseSong}
        otherVersions={baseSong.other_versions || []}
        onMerge={handleMergeSong}
      />
    </div>
  );
};

export default SongDetail;
