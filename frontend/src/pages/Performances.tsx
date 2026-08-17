import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Plus, Users, Download, CheckSquare, Square, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/config';

interface Tour {
  id: number;
  name: string;
}

interface Venue {
  id: number;
  name: string;
  prefecture: string | null;
}

interface Performance {
  id: number;
  name: string;
  date: string;
  tour: Tour | null;
  venue: Venue | null;
  event_type: string;
  performance_type: string;
  main_artist: { id: number; name: string } | null;
}

const Concerts = () => {
  const navigate = useNavigate();
  const [tours, setTours] = useState<Tour[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tours' | 'singles'>('tours');
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const [showTourModal, setShowTourModal] = useState(false);
  const [newTourName, setNewTourName] = useState("");
  const [savingTour, setSavingTour] = useState(false);

  const [showSingleModal, setShowSingleModal] = useState(false);
  const [newSingleName, setNewSingleName] = useState("");
  const [newSingleDate, setNewSingleDate] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);

  const [showSetlistImportModal, setShowSetlistImportModal] = useState(false);
  const [importTotal, setImportTotal] = useState<number>(0);
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importPage, setImportPage] = useState(1);
  const [hasMoreImportResults, setHasMoreImportResults] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Bulk import states
  const [importMode, setImportMode] = useState<'single' | 'bulk'>('single');
  const [selectedSetlists, setSelectedSetlists] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [toursRes, perfsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tours/`),
        fetch(`${API_BASE_URL}/performances/`)
      ]);
      if (toursRes.ok) setTours(await toursRes.json());
      if (perfsRes.ok) setPerformances(await perfsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTour = async () => {
    if (!newTourName.trim()) return;
    setSavingTour(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tours/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTourName.trim() })
      });
      if (res.ok) {
        setShowTourModal(false);
        setNewTourName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTour(false);
    }
  };

  const handleCreateSingle = async () => {
    if (!newSingleName.trim() || !newSingleDate) return;
    setSavingSingle(true);
    try {
      const payload = {
        name: newSingleName.trim(),
        date: newSingleDate,
        performance_type: "One-Man",
        event_type: "Live"
      };
      const res = await fetch(`${API_BASE_URL}/performances/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowSingleModal(false);
        setNewSingleName("");
        setNewSingleDate("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSingle(false);
    }
  };

  const handleSearchSetlist = async (page: number = 1) => {
    if (!importQuery.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/external/setlistfm/search?artist_name=${encodeURIComponent(importQuery)}&p=${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.setlist || [];
        setImportResults(results);
        setImportPage(page);
        setImportTotal(data.total || 0);
        // Setlist.fm returns up to 20 items per page
        setHasMoreImportResults(results.length === 20);
        setSelectedSetlists(new Set()); // Reset selections
      }
    } catch (err) { console.error(err); }
  };

  const handleImportSetlist = async (setlistId: string) => {
    setImporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/external/setlistfm/import`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ setlist_id: setlistId })
      });
      if (res.ok) {
        const data = await res.json();
        setShowSetlistImportModal(false);
        // Automatically navigate to the new performance
        navigate(`/performances/${data.performance_id}`);
      }
    } catch (err) { console.error(err); }
    finally { setImporting(false); }
  };

  // Bulk Action states
  const [selectedSingles, setSelectedSingles] = useState<Set<number>>(new Set());
  const [showBulkTourModal, setShowBulkTourModal] = useState(false);
  const [bulkTourId, setBulkTourId] = useState<number | null>(null);
  const [showBulkCopyModal, setShowBulkCopyModal] = useState(false);
  const [bulkSourceId, setBulkSourceId] = useState<number | null>(null);

  const toggleSingleSelection = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newSet = new Set(selectedSingles);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSingles(newSet);
  };

  const handleBulkUpdateTour = async () => {
    if (!bulkTourId || selectedSingles.size === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/performances/bulk-update-tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performance_ids: Array.from(selectedSingles), tour_id: bulkTourId })
      });
      if (res.ok) {
        setShowBulkTourModal(false);
        setSelectedSingles(new Set());
        fetchData();
        toast.success(`ツアーへの紐付けが完了しました (${selectedSingles.size}件)`);
      } else {
        toast.error('ツアーへの紐付けに失敗しました');
      }
    } catch (e) {
      console.error(e);
      toast.error('エラーが発生しました');
    }
  };

  const handleBulkCopySetlist = async () => {
    if (!bulkSourceId || selectedSingles.size === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/performances/bulk-copy-setlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_performance_ids: Array.from(selectedSingles), source_performance_id: bulkSourceId })
      });
      if (res.ok) {
        setShowBulkCopyModal(false);
        setSelectedSingles(new Set());
        fetchData();
        toast.success(`セットリストのコピーが完了しました (${selectedSingles.size}件)`);
      } else {
        toast.error('セットリストのコピーに失敗しました');
      }
    } catch (e) {
      console.error(e);
      toast.error('エラーが発生しました');
    }
  };
  
  const handleBulkImport = async () => {
    if (selectedSetlists.size === 0) return;
    setImporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/external/setlistfm/bulk-import`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ setlist_ids: Array.from(selectedSetlists) })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.errors && data.errors.length > 0) {
          toast.success(`一部のセットリストのインポートが完了しました (${data.successes.length}件)\n${data.errors.length}件のエラーが発生しました`);
        } else {
          toast.success(`選択したセットリストのインポートが完了しました (${data.successes.length}件)`);
        }
        setShowSetlistImportModal(false);
        setImportQuery("");
        setImportResults([]);
        setSelectedSetlists(new Set());
        fetchData();
      } else {
        toast.error('インポートに失敗しました');
      }
    } catch (err) {
      console.error(err);
      toast.error('エラーが発生しました');
    } finally {
      setImporting(false);
    }
  };

  const handleFullSyncArtist = async (query: string, artistMbid?: string, artistName?: string) => {
    const confirm = window.confirm(`「${artistName || query}」の全履歴（約${importTotal}件）を同期します。データ量により数十秒〜数分かかる場合がありますが、よろしいですか？`);
    if (!confirm) return;

    setImporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/external/setlistfm/full-sync-artist`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ artist_name: artistName || query, artist_mbid: artistMbid })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.errors && data.errors.length > 0) {
          toast.success(`同期が完了しました (${data.successes.length}件)\n${data.errors.length}件のエラーが発生しました`);
        } else {
          toast.success(`${artistName}の全履歴同期が完了しました (${data.successes?.length || 0}件)`);
        }
        setShowSetlistImportModal(false);
        setImportQuery("");
        setImportResults([]);
        setSelectedSetlists(new Set());
        fetchData();
      } else {
        toast.error('同期に失敗しました');
      }
    } catch (err) {
      console.error(err);
      toast.error('エラーが発生しました');
    } finally {
      setImporting(false);
    }
  };

  const toggleSetlistSelection = (id: string) => {
    const newSet = new Set(selectedSetlists);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSetlists(newSet);
  };

  const selectAll = () => {
    if (selectedSetlists.size === importResults.length) {
      setSelectedSetlists(new Set());
    } else {
      setSelectedSetlists(new Set(importResults.map(sl => sl.id)));
    }
  };

  const standalonePerformances = performances.filter(p => !p.tour);
  const filteredTours = tours.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSingles = standalonePerformances.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="Concerts"
        subtitle="ツアーや単発のライブ、セットリストを管理します"
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveTab('tours')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'tours' ? '#1DB954' : 'var(--bg-tertiary)',
            color: activeTab === 'tours' ? '#fff' : 'var(--text-primary)',
            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s'
          }}
        >
          🎤 ツアー一覧
        </button>
        <button
          onClick={() => setActiveTab('singles')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'singles' ? '#1DB954' : 'var(--bg-tertiary)',
            color: activeTab === 'singles' ? '#fff' : 'var(--text-primary)',
            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s'
          }}
        >
          🎸 単発ライブ一覧
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ flex: 1, maxWidth: '600px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="イベント名を検索..."
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => activeTab === 'tours' ? setShowTourModal(true) : setShowSingleModal(true)}
            style={{
              background: 'var(--spotify-color)', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Plus size={18} />
            {activeTab === 'tours' ? '新規ツアー登録' : '新規ライブ登録'}
          </button>
          {user?.is_admin && (
            <button
              onClick={() => { setShowSetlistImportModal(true); setImportMode('single'); }}
              style={{
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                padding: '10px 20px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Download size={18} />
              インポート
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {activeTab === 'tours' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredTours.map(tour => (
                <Link key={`tour-${tour.id}`} to={`/tours/${tour.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', marginBottom: '12px' }}>
                      <Calendar size={18} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>TOUR / EVENT</span>
                    </div>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', lineHeight: '1.4' }}>{tour.name}</h3>
                  </div>
                </Link>
              ))}
              {filteredTours.length === 0 && <EmptyState icon={Calendar} title="ツアーがありません" description="ツアーをインポートするか、新しく作成してください。" />}
            </div>
          )}

          {activeTab === 'singles' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredSingles.map(perf => (
                <Link key={`perf-${perf.id}`} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                    <div 
                      onClick={(e) => toggleSingleSelection(e, perf.id)}
                      style={{ 
                        width: '24px', height: '24px', borderRadius: '4px', 
                        border: selectedSingles.has(perf.id) ? '2px solid var(--spotify-color)' : '2px solid var(--border-color)',
                        background: selectedSingles.has(perf.id) ? 'var(--spotify-color)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {selectedSingles.has(perf.id) && <CheckSquare size={16} color="#fff" />}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', transition: 'all 0.2s',
                    height: '100%', display: 'flex', flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingRight: '32px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--warning-bg)', padding: '2px 8px', borderRadius: '12px', alignSelf: 'flex-start' }}>
                        {perf.event_type}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{perf.date}</span>
                    </div>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', lineHeight: '1.4', flex: 1 }}>{perf.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} />
                        <span>{perf.main_artist ? perf.main_artist.name : 'Unknown Artist'}</span>
                      </div>
                      {perf.venue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={16} />
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perf.venue.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {filteredSingles.length === 0 && <EmptyState icon={Calendar} title="単発ライブがありません" description="インポートするか、新しく追加してください。" />}
            </div>
          )}
        </>
      )}

      {/* Setlist.fm インポートモーダル */}
      {showSetlistImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '700px', border: '1px solid var(--border-color)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column'
          }}>
            {importing && <LoadingSpinner />}
            
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Setlist.fm からインポート</h2>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button
                onClick={() => setImportMode('single')}
                style={{
                    background: 'none', border: 'none', color: importMode === 'single' ? 'var(--spotify-color)' : 'var(--text-secondary)',
                    fontWeight: importMode === 'single' ? 700 : 500, cursor: 'pointer', padding: '4px 8px'
                }}
                >
                個別インポート
                </button>
                <button
                onClick={() => setImportMode('bulk')}
                style={{
                    background: 'none', border: 'none', color: importMode === 'bulk' ? 'var(--spotify-color)' : 'var(--text-secondary)',
                    fontWeight: importMode === 'bulk' ? 700 : 500, cursor: 'pointer', padding: '4px 8px'
                }}
                >
                一括インポート
                </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                value={importQuery}
                onChange={e => setImportQuery(e.target.value)}
                placeholder={importMode === 'bulk' ? "アーティスト名で検索 (ツアー名も可)..." : "アーティスト名で検索..."}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
              <Button variant="primary" icon={Search} onClick={() => handleSearchSetlist(1)} disabled={importing}>
                検索
              </Button>
            </div>
            
            {importMode === 'bulk' && importResults.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selectedSetlists.size === importResults.length ? <CheckSquare size={16} /> : <Square size={16} />}
                        すべて選択
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedSetlists.size}件選択中</span>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              {importResults.map((sl: any) => {
                let songCount = 0;
                if (sl.sets && sl.sets.set) {
                  sl.sets.set.forEach((s: any) => {
                    if (s.song) songCount += s.song.length;
                  });
                }
                const isSelected = selectedSetlists.has(sl.id);
                
                return (
                  <div key={sl.id} style={{ 
                    background: isSelected ? 'rgba(29, 185, 84, 0.1)' : 'var(--bg-tertiary)', 
                    padding: '16px', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: isSelected ? '1px solid var(--spotify-color)' : '1px solid transparent',
                    cursor: importMode === 'bulk' ? 'pointer' : 'default'
                   }}
                   onClick={() => { if (importMode === 'bulk') toggleSetlistSelection(sl.id); }}
                   >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {importMode === 'bulk' && (
                          <div style={{ color: isSelected ? 'var(--spotify-color)' : 'var(--text-secondary)' }}>
                              {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{sl.eventDate} - {sl.tour?.name || 'No Tour Name'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{sl.venue?.name}, {sl.venue?.city?.name}</div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: songCount > 0 ? 'var(--spotify-color)' : 'var(--error-color)',
                          fontWeight: 600,
                          marginTop: '4px'
                        }}>
                          楽曲数: {songCount}曲
                        </div>
                      </div>
                    </div>
                    {importMode === 'single' && (
                        <Button variant="primary" onClick={() => handleImportSetlist(sl.id)} disabled={importing}>
                          インポート
                        </Button>
                    )}
                  </div>
                );
              })}
              {importResults.length === 0 && importQuery && (
                  <EmptyState icon={Search} title="検索結果がありません" description="別のキーワードをお試しください。" />
              )}
            </div>

            {importResults.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <button 
                  onClick={() => handleSearchSetlist(importPage - 1)}
                  disabled={importPage <= 1}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '4px', cursor: importPage <= 1 ? 'not-allowed' : 'pointer', opacity: importPage <= 1 ? 0.5 : 1 }}
                >
                  前の20件
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  ページ {importPage} (全 {importTotal} 件)
                </span>
                <button 
                  onClick={() => handleSearchSetlist(importPage + 1)}
                  disabled={!hasMoreImportResults}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '4px', cursor: !hasMoreImportResults ? 'not-allowed' : 'pointer', opacity: !hasMoreImportResults ? 0.5 : 1 }}
                >
                  次の20件
                </button>
              </div>
            )}

              {importResults.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <Button variant="secondary" onClick={() => {
                      const firstArtist = importResults[0]?.artist;
                      handleFullSyncArtist(importQuery, firstArtist?.mbid, firstArtist?.name);
                    }} disabled={importing} style={{ marginRight: '12px' }}>
                    「{importResults[0]?.artist?.name || importQuery}」の全履歴 ({importTotal}件) を同期
                  </Button>
                  {importMode === 'bulk' && (
                      <Button variant="primary" onClick={handleBulkImport} disabled={importing || selectedSetlists.size === 0}>
                        選択した {selectedSetlists.size}件 をインポート
                      </Button>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setShowSetlistImportModal(false)}>
                閉じる
              </Button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* 新規ツアー作成モーダル */}
      {showTourModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '24px' }}>新規ツアー登録</h2>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ツアー・シリーズ名</label>
              <input
                type="text"
                value={newTourName}
                onChange={e => setNewTourName(e.target.value)}
                placeholder="例: TOUR 2024『Catcher In The Spy』"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowTourModal(false)}
                style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateTour}
                disabled={savingTour || !newTourName.trim()}
                style={{
                  padding: '10px 20px', borderRadius: '24px', background: 'var(--spotify-color)', color: '#fff', border: 'none',
                  cursor: (savingTour || !newTourName.trim()) ? 'not-allowed' : 'pointer', opacity: (savingTour || !newTourName.trim()) ? 0.5 : 1
                }}
              >
                {savingTour ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規単発ライブ作成モーダル */}
      {showSingleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '24px' }}>新規単発ライブ登録</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ライブ・イベント名</label>
              <input
                type="text"
                value={newSingleName}
                onChange={e => setNewSingleName(e.target.value)}
                placeholder="例: 15th Anniversary Live"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>開催日</label>
              <input
                type="date"
                value={newSingleDate}
                onChange={e => setNewSingleDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowSingleModal(false)}
                style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateSingle}
                disabled={savingSingle || !newSingleName.trim() || !newSingleDate}
                style={{
                  padding: '10px 20px', borderRadius: '24px', background: 'var(--spotify-color)', color: '#fff', border: 'none',
                  cursor: (savingSingle || !newSingleName.trim() || !newSingleDate) ? 'not-allowed' : 'pointer', opacity: (savingSingle || !newSingleName.trim() || !newSingleDate) ? 0.5 : 1
                }}
              >
                {savingSingle ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedSingles.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)', padding: '16px 32px', borderRadius: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '24px', zIndex: 100
        }}>
          <span style={{ fontWeight: 'bold' }}>{selectedSingles.size}件選択中</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowBulkTourModal(true)} style={{ background: 'var(--spotify-color)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
              ツアーに紐付け
            </button>
            <button onClick={() => setShowBulkCopyModal(true)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
              セットリストをコピー
            </button>
          </div>
        </div>
      )}

      {/* Bulk Tour Update Modal */}
      {showBulkTourModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '24px' }}>ツアーに紐付け</h2>
            <select value={bulkTourId || ""} onChange={e => setBulkTourId(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <option value="">選択してください...</option>
              {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowBulkTourModal(false)} style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleBulkUpdateTour} disabled={!bulkTourId} style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--spotify-color)', color: '#fff', border: 'none', cursor: 'pointer', opacity: !bulkTourId ? 0.5 : 1 }}>適用する</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Setlist Copy Modal */}
      {showBulkCopyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '24px' }}>セットリストをコピー</h2>
            <p style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>コピー元の公演を選択してください。選択した公演のセットリストで上書きされます。</p>
            <select value={bulkSourceId || ""} onChange={e => setBulkSourceId(Number(e.target.value))} style={{ width: '100%', padding: '12px', marginBottom: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <option value="">選択してください...</option>
              {performances.map(p => <option key={p.id} value={p.id}>{p.date} - {p.name}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowBulkCopyModal(false)} style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleBulkCopySetlist} disabled={!bulkSourceId} style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--error-color)', color: '#fff', border: 'none', cursor: 'pointer', opacity: !bulkSourceId ? 0.5 : 1 }}>上書きコピー</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Concerts;
