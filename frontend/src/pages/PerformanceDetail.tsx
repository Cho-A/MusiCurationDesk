import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useNavigationHistory } from '../context/NavigationHistoryContext';
import { ArrowLeft, Edit3, Save, X, ListMusic, ArrowUp, ArrowDown, Search, Link2Off, Copy, Users, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface Artist {
  id: number;
  name: string;
}

interface Venue {
  id: number;
  name: string;
  prefecture?: string;
}

interface SetlistEntry {
  id?: number;
  song_id?: number;
  entry_type: string;
  unresolved_song_name?: string;
  order_index: number;
  notes?: string;
  song?: {
    id: number;
    title: string;
  };
}

interface RosterEntry {
  id: number;
  artist: Artist;
  role: string;
  context?: string;
}

interface PerformanceDetail {
  id: number;
  name: string;
  date: string;
  event_type: string;
  performance_type: string;
  main_artist: Artist;
  venue?: Venue;
  tour?: {
    id: number;
    name: string;
  };
  setlist_entries: SetlistEntry[];
  roster_entries: RosterEntry[];
}

const PerformanceDetail = () => {
  const { id } = useParams();
  const { goBack } = useNavigationHistory();
  const [performance, setPerformance] = useState<PerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'setlist' | 'roster') || 'setlist';
  const setActiveTab = (tab: 'setlist' | 'roster') => {
    setSearchParams({ tab }, { replace: true });
  };

  // 編集モード用State
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [draftSetlist, setDraftSetlist] = useState<SetlistEntry[]>([]);

  // メタデータ編集用State
  const [metaName, setMetaName] = useState("");
  const [metaDate, setMetaDate] = useState("");
  const [metaEventType, setMetaEventType] = useState("");
  const [metaTourId, setMetaTourId] = useState<number | null>(null);
  const [tourPerformances, setTourPerformances] = useState<any[]>([]);
  const [copyFromPerfId, setCopyFromPerfId] = useState<number | "">("");
  const [tours, setTours] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // 楽曲検索用State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // カスタム（MC等）用State
  const [customType, setCustomType] = useState("MC");
  const [customName, setCustomName] = useState("");

  // マッピング用State
  const [mappingTargetEntry, setMappingTargetEntry] = useState<SetlistEntry | null>(null);
  const [mappingSearchQuery, setMappingSearchQuery] = useState("");
  const [mappingSearchResults, setMappingSearchResults] = useState<any[]>([]);

  const fetchPerformance = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/performances/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (data.setlist_entries) {
          data.setlist_entries.sort((a: any, b: any) => a.order_index - b.order_index);
        }
        setPerformance(data);
        setDraftSetlist(data.setlist_entries || []);
        setMetaName(data.name);
        setMetaDate(data.date);
        setMetaEventType(data.event_type || "");
        setMetaTourId(data.tour?.id || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPerformance();
  }, [id]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/tours/')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(err => console.error(err));
  }, []);


  useEffect(() => {
    if (performance && performance.tour && performance.setlist_entries && performance.setlist_entries.length === 0) {
      fetch(`http://127.0.0.1:8000/tours/${performance.tour.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.performances) {
            setTourPerformances(data.performances.filter((p: any) => p.id !== performance.id));
          }
        })
        .catch(err => console.error(err));
    }
  }, [performance]);

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const searchMappingSongs = async () => {
    if (!mappingSearchQuery.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/?title_search=${encodeURIComponent(mappingSearchQuery)}`);
      if (res.ok) {
        setMappingSearchResults(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapAlias = async (songId: number) => {
    if (!mappingTargetEntry || !mappingTargetEntry.unresolved_song_name) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${songId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias_name: mappingTargetEntry.unresolved_song_name })
      });
      if (res.ok) {
        await fetch(`http://127.0.0.1:8000/performances/${id}/setlist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: (performance?.setlist_entries || []).map(e => {
              if (e.id === mappingTargetEntry.id) {
                return { ...e, song_id: songId, unresolved_song_name: null };
              }
              return e;
            })
          })
        });
        setMappingTargetEntry(null);
        setMappingSearchQuery("");
        setMappingSearchResults([]);
        fetchPerformance();
      } else {
        const data = await res.json();
        alert(`エラー: ${data.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };


  const handleCopySetlist = async () => {
    if (!copyFromPerfId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/performances/${id}/copy-setlist?from_performance_id=${copyFromPerfId}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchPerformance();
      } else {
        alert("コピーに失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const handleSaveMeta = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/performances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metaName,
          date: metaDate,
          event_type: metaEventType,
          tour_id: metaTourId,
        })
      });
      if (res.ok) {
        setIsEditingMeta(false);
        fetchPerformance();
      } else {
        alert("保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    }
  };

  const addSongToDraft = (song: any) => {
    setDraftSetlist([...draftSetlist, {
      song_id: song.id,
      entry_type: "SONG",
      order_index: draftSetlist.length + 1,
      song: { id: song.id, title: song.title }
    }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const addCustomToDraft = () => {
    if (!customName.trim() && customType === "SONG") return; // SONGなら名前必須
    setDraftSetlist([...draftSetlist, {
      entry_type: customType,
      unresolved_song_name: customName.trim(),
      order_index: draftSetlist.length + 1
    }]);
    setCustomName("");
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newDraft = [...draftSetlist];
    const temp = newDraft[index];
    newDraft[index] = newDraft[index - 1];
    newDraft[index - 1] = temp;
    
    newDraft.forEach((item, idx) => item.order_index = idx + 1);
    setDraftSetlist(newDraft);
  };

  const moveDown = (index: number) => {
    if (index === draftSetlist.length - 1) return;
    const newDraft = [...draftSetlist];
    const temp = newDraft[index];
    newDraft[index] = newDraft[index + 1];
    newDraft[index + 1] = temp;

    newDraft.forEach((item, idx) => item.order_index = idx + 1);
    setDraftSetlist(newDraft);
  };

  const removeEntry = (index: number) => {
    const newDraft = [...draftSetlist];
    newDraft.splice(index, 1);
    newDraft.forEach((item, idx) => item.order_index = idx + 1);
    setDraftSetlist(newDraft);
  };

  const unlinkSong = (index: number) => {
    const newDraft = [...draftSetlist];
    const entry = newDraft[index];
    if (entry.song) {
      newDraft[index] = {
        ...entry,
        song_id: undefined,
        song: undefined,
        unresolved_song_name: entry.unresolved_song_name || entry.song.title,
      };
      setDraftSetlist(newDraft);
    }
  };

  const updateNotes = (index: number, notes: string) => {
    const newDraft = [...draftSetlist];
    newDraft[index].notes = notes;
    setDraftSetlist(newDraft);
  };

  const updateUnresolvedName = (index: number, name: string) => {
    const newDraft = [...draftSetlist];
    newDraft[index].unresolved_song_name = name;
    setDraftSetlist(newDraft);
  };

  const updateEntryType = (index: number, type: string) => {
    const newDraft = [...draftSetlist];
    newDraft[index].entry_type = type;
    setDraftSetlist(newDraft);
  };

  const handleSaveSetlist = async () => {
    setSaving(true);
    try {
      const payload = {
        entries: draftSetlist.map(e => ({
          song_id: e.song_id,
          entry_type: e.entry_type,
          unresolved_song_name: e.unresolved_song_name,
          order_index: e.order_index,
          notes: e.notes
        }))
      };

      const res = await fetch(`http://127.0.0.1:8000/performances/${id}/setlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditing(false);
        fetchPerformance();
      } else {
        alert("保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage message="公演情報を読み込んでいます..." />;
  if (!performance) return <div style={{ padding: '64px', textAlign: 'center', fontSize: '1.2rem', color: 'var(--error-color)' }}>Event not found.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px' }}>

      <button 
        onClick={() => goBack()}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '1rem'
        }}
      >
        <ArrowLeft size={20} />
        戻る
      </button>
      
      <div style={{ 
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <span style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginRight: '8px'
          }}>
            {performance.event_type}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{performance.date}</span>
        </div>
        
        {performance.tour && (
          <Link to={`/tours/${performance.tour.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'inline-block',
              background: 'rgba(76, 175, 80, 0.15)',
              color: 'var(--success-color)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '8px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              🔗 ツアー / イベント: {performance.tour.name}
            </div>
          </Link>
        )}
        
        {/* ヘッダー情報 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{performance.name}</h1>
            <button 
              onClick={() => setIsEditingMeta(true)}
              style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
              title="公演情報を編集"
            >
              <Edit3 size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {performance.main_artist ? (
            <Link to={`/artists/${performance.main_artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                {performance.main_artist.name[0]}
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{performance.main_artist.name}</span>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--warning-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                ✨
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--warning-color)' }}>Special Session</span>
            </div>
          )}
          {performance.venue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <span>📍</span>
              <span style={{ fontSize: '1.1rem' }}>
                {performance.venue.name} {performance.venue.prefecture && `(${performance.venue.prefecture})`}
              </span>
            </div>
          )}
        </div>
      </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          <button
            onClick={() => { setActiveTab('setlist'); setIsEditing(false); }}
            style={{
              flex: 1, padding: '12px', background: 'transparent', border: 'none',
              fontSize: '1rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeTab === 'setlist' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'setlist' ? '3px solid var(--success-color)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            🎵 セットリスト
          </button>
          <button
            onClick={() => { setActiveTab('roster'); setIsEditing(false); }}
            style={{
              flex: 1, padding: '12px', background: 'transparent', border: 'none',
              fontSize: '1rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeTab === 'roster' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'roster' ? '3px solid var(--success-color)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            🎸 参加メンバー
          </button>
        </div>
        
        {activeTab === 'setlist' && !isEditing && (
          <button 
            onClick={() => { setIsEditing(true); setDraftSetlist(performance.setlist_entries || []); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: 'none', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <Edit3 size={16} />
            編集
          </button>
        )}
      </div>

      <div>
        {activeTab === 'setlist' && !isEditing && (
          <div>
            {performance.setlist_entries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <EmptyState title="セットリストはまだ登録されていません" />
                {performance.tour && tourPerformances.length > 0 && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    width: '100%',
                    maxWidth: '560px', 
                    margin: '20px auto 0 auto', 
                    textAlign: 'left' 
                  }}>
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '0.9rem', 
                      color: 'var(--text-primary)', 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Copy size={16} style={{ color: 'var(--accent-primary)' }} /> 
                      同じツアーの別公演からセットリストをコピー
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select 
                        value={copyFromPerfId}
                        onChange={(e) => setCopyFromPerfId(e.target.value ? Number(e.target.value) : "")}
                        style={{ 
                          flex: 1, 
                          minWidth: 0, 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)', 
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">コピー元の公演を選択...</option>
                        {tourPerformances.map(p => (
                          <option key={p.id} value={p.id}>{p.date} - {p.name || (p.venue ? p.venue.name : "Unknown")}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleCopySetlist}
                        disabled={!copyFromPerfId}
                        style={{ 
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          padding: '10px 20px', 
                          background: 'var(--accent-primary)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: copyFromPerfId ? 'pointer' : 'not-allowed', 
                          opacity: copyFromPerfId ? 1 : 0.5,
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Copy size={15} />
                        コピー
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {performance.setlist_entries.map((entry, index) => {
                  const isEncore = entry.notes?.toLowerCase().includes('encore') || entry.notes?.includes('アンコール');
                  const prevIsEncore = index > 0 && (performance.setlist_entries[index - 1].notes?.toLowerCase().includes('encore') || performance.setlist_entries[index - 1].notes?.includes('アンコール'));
                  
                  return (
                    <React.Fragment key={entry.id || index}>
                      {isEncore && !prevIsEncore && (
                        <div style={{ margin: '16px 0 8px 0', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                          ENCORE
                        </div>
                      )}
                      {entry.song ? (
                        <Link to={`/songs/${entry.song.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ 
                            display: 'flex', alignItems: 'center', padding: '16px 20px', 
                            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px',
                            transition: 'background 0.2s', cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <div style={{ width: '40px', color: 'var(--text-tertiary)', fontWeight: 700 }}>{entry.order_index}</div>
                            <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: 500 }}>{entry.song.title}</div>
                            {entry.notes && !isEncore && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div style={{ 
                          display: 'flex', alignItems: 'center', padding: '16px 20px', 
                          background: 'transparent', borderRadius: '8px',
                          border: '1px dashed var(--border-color)',
                        }}>
                          <div style={{ width: '40px', color: 'var(--text-tertiary)', fontWeight: 700 }}>{entry.order_index}</div>
                          <div style={{ flex: 1, fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            {entry.unresolved_song_name || entry.entry_type}
                          </div>
                          {entry.unresolved_song_name && (
                            <button
                              onClick={() => setMappingTargetEntry(entry)}
                              style={{
                                marginRight: '16px', background: 'var(--success-bg)', color: 'var(--success-color)',
                                border: '1px solid rgba(76, 175, 80, 0.3)', padding: '6px 12px', borderRadius: '4px',
                                cursor: 'pointer', fontSize: '0.85rem'
                              }}
                            >
                              既存の楽曲と紐付ける
                            </button>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', flexShrink: 0 }}>
                            {entry.entry_type}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'setlist' && isEditing && (
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>セットリスト編集</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleSaveSetlist}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--success-color)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  <Save size={16} />
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </div>

            {/* 現在のドラフト */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
              {draftSetlist.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => moveUp(index)} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: index === 0 ? 'default' : 'pointer' }}><ArrowUp size={16} /></button>
                    <button onClick={() => moveDown(index)} disabled={index === draftSetlist.length - 1} style={{ background: 'none', border: 'none', color: index === draftSetlist.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: index === draftSetlist.length - 1 ? 'default' : 'pointer' }}><ArrowDown size={16} /></button>
                  </div>
                  
                  <div style={{ width: '30px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{index + 1}</div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {entry.song ? (
                      <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{entry.song.title}</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={entry.unresolved_song_name || ""}
                          onChange={(e) => updateUnresolvedName(index, e.target.value)}
                          placeholder="曲名 / 詳細..."
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 500, width: '100%', maxWidth: '250px' }}
                        />
                        <select
                          value={entry.entry_type}
                          onChange={(e) => updateEntryType(index, e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--warning-color)', padding: '6px', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                          <option value="SONG">SONG</option>
                          <option value="MC">MC</option>
                          <option value="SE">SE</option>
                          <option value="JAM">JAM</option>
                          <option value="SOLO">SOLO</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Encore, Medley など..." 
                    value={entry.notes || ""}
                    onChange={(e) => updateNotes(index, e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', width: '150px' }}
                  />

                  {entry.song && (
                    <button 
                      onClick={() => unlinkSong(index)}
                      style={{ background: 'none', border: 'none', color: 'var(--warning-color)', cursor: 'pointer', padding: '8px' }}
                      title="紐付けを解除"
                    >
                      <Link2Off size={18} />
                    </button>
                  )}

                  <button 
                    onClick={() => removeEntry(index)}
                    style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '8px' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {draftSetlist.length === 0 && <EmptyState icon={ListMusic} title="曲がありません" />}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

            {/* 追加パネル */}
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>登録済みの楽曲を検索</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    placeholder="曲名で検索..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchSongs()}
                    style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
                  />
                  <button onClick={searchSongs} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}><Search size={18} /></button>
                </div>
                {searchResults.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map(song => (
                      <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {song.title}
                            {!song.is_video && song.is_streaming_available === false && (
                              <span style={{color: 'var(--error-color)', fontSize: '0.8rem', border: '1px solid #ff4d4d', padding: '2px 4px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'}}>
                                サブスク未解禁
                              </span>
                            )}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                            <span>👤 {song.artist_links?.map((a: any) => a.artist_name).join(', ') || '不明'}</span>
                            {song.primary_album && <span>💿 {song.primary_album.main_title}</span>}
                            {song.version_name && <span style={{ color: '#88aaff' }}>[{song.version_name}]</span>}
                          </div>
                        </div>
                        <button onClick={() => addSongToDraft(song)} style={{ background: 'var(--success-color)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>追加</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ width: '1px', background: '#444' }}></div>

              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>未登録曲・MCなどを追加</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select 
                    value={customType} 
                    onChange={(e) => setCustomType(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="MC">MC</option>
                    <option value="SE">SE (BGM)</option>
                    <option value="JAM">JAM Session</option>
                    <option value="SOLO">Solo (Drum/Bass/Guitar)</option>
                    <option value="SONG">未登録の曲 (カバー等)</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="詳細 (例: Drum Solo, カバー曲名)" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
                  />
                  <button onClick={addCustomToDraft} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>追加</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div>
            {performance.roster_entries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <EmptyState icon={Users} title="参加メンバー情報はありません。" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {performance.roster_entries.map((entry) => (
                  <div key={entry.id} style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{entry.role}</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{entry.artist.name}</span>
                    {entry.context && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{entry.context}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {mappingTargetEntry && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '32px', borderRadius: '16px', width: '500px', maxWidth: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>「{mappingTargetEntry.unresolved_song_name}」を紐付ける</h2>
              <button onClick={() => setMappingTargetEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              該当する楽曲を検索して選択してください。選択すると、この英語名がデータベースにAliasとして学習され、次回から自動でマッチングされるようになります。
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="日本語の曲名で検索..." 
                value={mappingSearchQuery}
                onChange={(e) => setMappingSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMappingSongs()}
                style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
              />
              <button onClick={searchMappingSongs} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}><Search size={18} /></button>
            </div>

            {mappingSearchResults.length > 0 && (
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {mappingSearchResults.map(song => (
                  <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {song.title}
                        {!song.is_video && song.is_streaming_available === false && (
                          <span style={{color: 'var(--error-color)', fontSize: '0.8rem', border: '1px solid #ff4d4d', padding: '2px 4px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'}}>
                            サブスク未解禁
                          </span>
                        )}
                      </span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                        <span>👤 {song.artist_links?.map((a: any) => a.artist_name).join(', ') || '不明'}</span>
                        {song.primary_album && <span>💿 {song.primary_album.main_title}</span>}
                        {song.version_name && <span style={{ color: '#88aaff' }}>[{song.version_name}]</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleMapAlias(song.id)} 
                      style={{ background: 'var(--success-color)', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      これに紐付ける
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 公演メタデータ編集モーダル */}
      {isEditingMeta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '32px', borderRadius: '16px', width: '500px', maxWidth: '90%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>公演情報を編集</h2>
              <button onClick={() => setIsEditingMeta(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>公演タイトル</label>
                <input 
                  type="text" 
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>日付 (YYYY-MM-DD)</label>
                <input 
                  type="date" 
                  value={metaDate}
                  onChange={(e) => setMetaDate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>イベント種別</label>
                <select
                  value={metaEventType}
                  onChange={(e) => setMetaEventType(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }}
                >
                  <option value="Live">Live</option>
                  <option value="Tour">Tour</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ツアー (任意)</label>
                <select
                  value={metaTourId || ""}
                  onChange={(e) => {
                    const newTourId = e.target.value ? Number(e.target.value) : null;
                    setMetaTourId(newTourId);
                    
                    if (newTourId && metaName && metaName.includes('Live at')) {
                      const selectedTour = tours.find(t => t.id === newTourId);
                      if (selectedTour) {
                        const venueName = performance?.venue?.name || 'Unknown Venue';
                        setMetaName(`${selectedTour.name} @ ${venueName}`);
                      }
                    }
                  }}
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '6px' }}
                >
                  <option value="">(なし - 単発ライブ)</option>
                  {tours.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setIsEditingMeta(false)} 
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveMeta} 
                style={{ background: 'var(--success-color)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformanceDetail;
