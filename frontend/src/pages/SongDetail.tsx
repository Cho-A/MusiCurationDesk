import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Edit2, Link as LinkIcon, Unlink, Music, Video, ListMusic, Check, Film, X } from 'lucide-react';
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
  album_type?: string;
  album_group_id?: number;
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
  spotify_song_id?: string | null;
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
    jasrac_code?: string;
    iswc_code?: string;
    artist_links: WorkArtistLink[];
  };
}

const SongDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Base data fetched from API（URLのidが変わった時だけAPIを叩く）
  const [baseSong, setBaseSong] = useState<SongDetailData | null>(null);
  
  // 現在表示中のバージョンID（APIコールは発生しない、表示の切り替えのみ）
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
  const [isEditingWorkTitle, setIsEditingWorkTitle] = useState(false);
  const [editWorkTitleValue, setEditWorkTitleValue] = useState("");

  const [isEditingMainArtist, setIsEditingMainArtist] = useState(false);
  const [mainArtistSearchQuery, setMainArtistSearchQuery] = useState("");
  const [mainArtistSearchResults, setMainArtistSearchResults] = useState<{id: number, name: string}[]>([]);

  const fetchBaseSong = async (songIdToFetch: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${songIdToFetch}`);
      if (res.ok) {
        const data = await res.json();
        setBaseSong(data);
        setSelectedVersionId(Number(songIdToFetch));
        setActiveCategory(data.is_video ? 'video' : 'audio');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // URLのidが変わった時だけAPIを叩く（バージョン切り替えではここは発火しない）
  useEffect(() => {
    if (id) fetchBaseSong(id);
  }, [id]);

  // バージョン切り替え：URLをreplaceしてAPIから完全なデータを再取得する（履歴は積まない）
  const handleVersionSelect = (versionId: number) => {
    if (versionId.toString() === id) return;
    navigate(`/songs/${versionId}`, { replace: true });
  };

  const handleMainArtistSearch = async (query: string) => {
    setMainArtistSearchQuery(query);
    if (query.length < 2) {
      setMainArtistSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/artists/?name_search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMainArtistSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMainArtist = async (artistId: number) => {
    if (!selectedVersionId) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/main_artist`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ artist_id: artistId })
      });
      if (res.ok) {
        setIsEditingMainArtist(false);
        if (id) fetchBaseSong(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMainArtist = async (name: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/artists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        handleSaveMainArtist(data.id);
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
        if (selectedVersionId) fetchBaseSong(selectedVersionId.toString());
      } else {
        alert("クレジットの削除に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleIsVideo = async () => {
    if (!baseSong) return;
    const nextVal = !displaySong.is_video;
    if (!window.confirm(`このバージョンを「${nextVal ? '映像' : '音源'}」に変更しますか？`)) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_video: nextVal })
      });
      if (res.ok) {
        if (id) fetchBaseSong(id);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleUpdateWorkTitle = async () => {
    if (!baseSong?.work) return;
    const work = baseSong.work;
    
    // ダイアログで警告を出す
    const confirmed = window.confirm(`【警告】\nこの楽曲名(Work名)を変更すると、このWorkに紐づく他のすべてのバージョン（全${(baseSong.other_versions?.length || 0) + 1}曲）のWork名も同時に変更されます。\n\n本当に変更してもよろしいですか？`);
    if (!confirmed) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/works/${work.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editWorkTitleValue,
          jasrac_code: work.jasrac_code,
          iswc_code: work.iswc_code
        })
      });
      if (res.ok) {
        if (id) fetchBaseSong(id);
        setIsEditingWorkTitle(false);
      } else {
        alert("更新に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("更新エラーが発生しました");
    }
  };

  const handleDetachWork = async () => {
    if (!window.confirm("このバージョンを現在の作品から切り離し、独立した新しい作品として登録しますか？")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/detach`, { method: 'POST' });
      if (res.ok) {
        alert("切り離しが完了しました");
        if (id) fetchBaseSong(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachWork = async (targetId: number) => {
    if (!window.confirm(`このバージョンを対象の楽曲(ID: ${targetId})の作品に統合しますか？`)) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}/attach_to_song?target_song_id=${targetId}`, { method: 'POST' });
      if (res.ok) {
        alert("結合が完了しました");
        setIsAttachModalOpen(false);
        if (id) fetchBaseSong(id);
      } else {
        alert("結合に失敗しました。");
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

  // selectedVersionIdに対応するデータ（APIコールなし、baseSongのother_versionsから取る）
  const displaySong = uniqueVersions.find(v => v.id === selectedVersionId) ?? baseSong;
  const mainArtists = (displaySong.artist_links || []).filter((l: ArtistLink) => l.role_category === 'Artist');

  const handleCategorySwitch = (cat: 'audio' | 'video') => {
    setActiveCategory(cat);
    const targetList = cat === 'audio' ? audioVersions : videoVersions;
    if (targetList.length > 0 && !targetList.find(v => v.id === selectedVersionId)) {
      handleVersionSelect(targetList[0].id);
    }
  };

  // クレジットのソートロジック（displaySongのデータを使用）
  const roleOrder = ['Artist', 'Composer', 'Lyricist', 'Producer', 'Arranger'];
  const sortedCredits = [...(displaySong.artist_links || [])].sort((a, b) => {
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
  let rawDisplayAlbums: AlbumTrackInfo[] = [];
  if (showAllAlbums) {
    rawDisplayAlbums = displaySong.album_links || [];
  } else {
    rawDisplayAlbums = (displaySong.album_links || []).filter((a: AlbumTrackInfo) => a.song_id === displaySong.id);
  }

  // 同じ AlbumGroup (またはタイトル) でグループ化し、重複表示を防ぐ
  const groupedAlbumsMap = new Map<string, { groupData: AlbumTrackInfo, editions: AlbumTrackInfo[] }>();
  rawDisplayAlbums.forEach(albumLink => {
    const key = albumLink.album.album_group_id ? String(albumLink.album.album_group_id) : albumLink.album.main_title;
    if (!groupedAlbumsMap.has(key)) {
      groupedAlbumsMap.set(key, { groupData: albumLink, editions: [] });
    }
    groupedAlbumsMap.get(key)!.editions.push(albumLink);
  });
  const displayAlbums = Array.from(groupedAlbumsMap.values());

  // Workクレジット（baseSongのwork情報を使用）
  const lyricists = (baseSong.work?.artist_links ?? []).filter((l: WorkArtistLink) => l.role_category === 'Lyricist').map((l: WorkArtistLink) => l.artist_name);
  const composers = (baseSong.work?.artist_links ?? []).filter((l: WorkArtistLink) => l.role_category === 'Composer').map((l: WorkArtistLink) => l.artist_name);

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
        <div style={{ fontSize: '0.9rem', color: 'var(--spotify-color)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em' }}>
          楽曲 (WORK)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          {isEditingWorkTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text" 
                value={editWorkTitleValue} 
                onChange={(e) => setEditWorkTitleValue(e.target.value)}
                style={{ fontSize: '1.5rem', padding: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
              <button onClick={handleUpdateWorkTitle} style={{ background: 'var(--success-color)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
              <button onClick={() => setIsEditingWorkTitle(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {baseSong.work?.title || baseSong.title}
              </h1>
              {baseSong.work && (
                <button 
                  onClick={() => { setEditWorkTitleValue(baseSong.work!.title); setIsEditingWorkTitle(true); }}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Work名を編集"
                >
                  <Edit2 size={20} />
                </button>
              )}
            </>
          )}
        </div>
        
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
                <span style={{color: 'var(--error-color)', marginLeft: '6px', fontSize: '0.8em', border: '1px solid #ff4d4d', padding: '1px 4px', borderRadius: '4px'}}>
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
                  {displaySong.title}
                  {!displaySong.is_video && displaySong.is_streaming_available === false && (
                    <span style={{color: 'var(--error-color)', fontSize: '0.9rem', border: '1px solid #ff4d4d', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'}}>
                      サブスク未解禁
                    </span>
                  )}
                </h2>
                <button 
                  onClick={() => { 
                    setEditTitleValue(displaySong.title); 
                    setEditVersionNameValue(displaySong.version_name || "");
                    setEditStreamingValue(displaySong.is_streaming_available !== false);
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
              {displaySong.version_name && (
                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '4px' }}>
                  {displaySong.version_name}
                </div>
              )}
              {/* Main Artist Display and Edit */}
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {isEditingMainArtist ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '250px' }}>
                    <input 
                      type="text"
                      value={mainArtistSearchQuery}
                      onChange={(e) => handleMainArtistSearch(e.target.value)}
                      placeholder="メインアーティストを変更 (任意)"
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={() => setIsEditingMainArtist(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <X size={20} />
                    </button>
                    {(mainArtistSearchResults.length > 0 || mainArtistSearchQuery.length >= 2) && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: '4px' }}>
                        {mainArtistSearchResults.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => handleSaveMainArtist(a.id)}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {a.name}
                          </div>
                        ))}
                        {mainArtistSearchQuery.length >= 2 && !mainArtistSearchResults.find(a => a.name.toLowerCase() === mainArtistSearchQuery.toLowerCase()) && (
                          <div 
                            onClick={() => handleCreateMainArtist(mainArtistSearchQuery)}
                            style={{ padding: '10px 12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            + 「{mainArtistSearchQuery}」を新しく追加
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {mainArtists.length > 0 ? mainArtists.map((ma: any) => ma.artist_name).join(', ') : 'アーティスト未設定'}
                    </span>
                    <button 
                      onClick={() => { setMainArtistSearchQuery(""); setIsEditingMainArtist(true); setMainArtistSearchResults([]); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      title="メインアーティストを編集"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* 種別変更トグル */}
            <button
              onClick={handleToggleIsVideo}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                borderColor: displaySong.is_video ? 'var(--accent-primary)' : 'var(--accent-primary)',
                background: 'var(--bg-tertiary)',
                color: displaySong.is_video ? '#ff4d4d' : '#1DB954',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto'
              }}
              title="クリックで音源/映像を切り替え"
            >
              {displaySong.is_video ? <Film size={14} /> : <Music size={14} />}
              種別: {displaySong.is_video ? '映像' : '音源'}
            </button>
          </div>
          
          {/* Spotify Embed & Link */}
          {displaySong.spotify_song_id && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <a href={`https://open.spotify.com/track/${displaySong.spotify_song_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--spotify-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px', width: 'fit-content' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.56.3z" />
                </svg>
                Spotifyで開く
              </a>
              <iframe 
                key={displaySong.spotify_song_id}
                src={`https://open.spotify.com/embed/track/${displaySong.spotify_song_id}`} 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allow="encrypted-media"
                style={{ borderRadius: '12px' }}
              ></iframe>
            </div>
          )}
          
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
              {!displaySong.is_video && (
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
                  is_streaming_available: displaySong.is_video ? true : editStreamingValue
                };
                const res = await fetch(`http://127.0.0.1:8000/songs/${selectedVersionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  setIsEditingTitle(false);
                  if (id) fetchBaseSong(id);
                }
              }} style={{ background: 'var(--spotify-color)', color: '#000', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                保存
              </button>
              <button onClick={() => setIsEditingTitle(false)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                キャンセル
              </button>
            </div>
          )}

          <SongTagEditor 
            songId={displaySong.id} 
            existingTags={displaySong.tags || []} 
            onTagsChange={(newTags) => setBaseSong({...baseSong, tags: newTags})} 
          />
        </div>

        {/* クレジット (バージョンごと) */}
        <div>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
            バージョンごとのクレジット (編曲・演奏)
          </h3>
          <SongCreditEditor 
            songId={displaySong.id} 
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
            {displayAlbums.map(({ groupData: albumLink, editions }, idx) => {
              const editionsMap = new Map<number, { album: AlbumMini, tracks: AlbumTrackInfo[] }>();
              editions.forEach(t => {
                if (!editionsMap.has(t.album_id)) {
                  editionsMap.set(t.album_id, { album: t.album, tracks: [] });
                }
                editionsMap.get(t.album_id)!.tracks.push(t);
              });
              
              const sortedEditions = Array.from(editionsMap.values()).sort((a, b) => {
                const getScore = (title?: string) => {
                  if (!title) return 1;
                  const lower = title.toLowerCase();
                  if (lower.includes('通常') || lower.includes('regular')) return 1;
                  if (lower.includes('初回') || lower.includes('first press')) return 2;
                  if (lower.includes('限定') || lower.includes('limited')) return 3;
                  return 4;
                };
                const scoreA = getScore(a.album.version_title);
                const scoreB = getScore(b.album.version_title);
                if (scoreA !== scoreB) return scoreA - scoreB;
                return (a.album.version_title || '').localeCompare(b.album.version_title || '');
              });

              const shortestMainTitle = sortedEditions.reduce((shortest, current) => {
                  return current.album.main_title.length < shortest.length ? current.album.main_title : shortest;
              }, sortedEditions[0].album.main_title);

              const targetAlbumId = sortedEditions[0].album.id;
              const targetDiscNumber = sortedEditions[0].tracks.length > 0 ? sortedEditions[0].tracks[0].disc_number : 1;

              return (
              <Link key={`${albumLink.album_id}-${albumLink.disc_number}-${albumLink.track_number}-${idx}`} to={`/album-groups/${albumLink.album.album_group_id || albumLink.album_id}?album_id=${targetAlbumId}&disc_number=${targetDiscNumber}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                >
                  <div style={{ 
                    width: '48px', height: '48px', backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0
                  }}>
                    {(albumLink.album.cover_image_url || editions.find(e => e.album.cover_image_url)?.album.cover_image_url) ? (
                      <img src={albumLink.album.cover_image_url || editions.find(e => e.album.cover_image_url)?.album.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Disc3 size={24} color="var(--text-secondary)" />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {shortestMainTitle}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      {sortedEditions.map(editionGroup => (
                        <div key={editionGroup.album.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {editionGroup.album.version_title || '通常盤'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {editionGroup.tracks
                              .sort((a, b) => a.disc_number !== b.disc_number ? a.disc_number - b.disc_number : a.track_number - b.track_number)
                              .map((t, i) => (
                              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 500 }} title={t.display_title || t.song_title || ''}>
                                {t.is_video ? <Film size={12} color="#ff4d4d" /> : <Music size={12} color="#1DB954" />}
                                D{t.disc_number}-T{t.track_number}
                                {(t.display_title || (t.song_title && t.song_title !== displaySong.title)) && (
                                  <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '4px', fontWeight: 'normal' }}>
                                    {t.display_title || t.song_title}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
              );
            })}
            
            {displayAlbums.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', gridColumn: '1 / -1' }}>収録アルバム情報はありません。</div>
            )}
          </div>
        </div>

        {/* タイアップ */}
        <div>
          <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
            タイアップ
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(displaySong.tieup_links || []).map((tieup: TieupLink, idx: number) => (
              <Link key={idx} to={`/tieups/${tieup.tieup_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ 
                  background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px',
                  transition: 'background 0.2s ease', cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--spotify-color)', marginBottom: '4px' }}>{tieup.tieup_category}</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tieup.tieup_name}</div>
                  {tieup.context && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{tieup.context}</div>}
                </div>
              </Link>
            ))}
            {(!displaySong.tieup_links || displaySong.tieup_links.length === 0) && (
              <p style={{ color: 'var(--text-secondary)' }}>タイアップ情報はありません。</p>
            )}
          </div>
        </div>

        {/* 高級管理（原曲との紐付け管理） */}
        <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--error-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            楽曲・原曲との紐付け管理
          </h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            現在の原曲 ID: <strong>{displaySong.work_id || '未設定'}</strong><br />
            <span style={{ fontSize: '0.85rem' }}>
              ※同名異曲を別の楽曲として独立させたり、誤って別々に登録されたバージョンを同じ原曲にまとめることができます。
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleDetachWork}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--error-color)',
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
                padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--warning-color)',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
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
        currentSong={displaySong}
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
