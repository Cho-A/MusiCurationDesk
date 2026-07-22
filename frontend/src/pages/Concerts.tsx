import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Plus, Users, Download, CheckSquare, Square } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';

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

  const [showTourModal, setShowTourModal] = useState(false);
  const [newTourName, setNewTourName] = useState("");
  const [savingTour, setSavingTour] = useState(false);

  const [showSingleModal, setShowSingleModal] = useState(false);
  const [newSingleName, setNewSingleName] = useState("");
  const [newSingleDate, setNewSingleDate] = useState("");
  const [savingSingle, setSavingSingle] = useState(false);

  const [showSetlistImportModal, setShowSetlistImportModal] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState<any[]>([]);
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
        fetch('http://127.0.0.1:8000/tours/'),
        fetch('http://127.0.0.1:8000/performances/')
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
      const res = await fetch('http://127.0.0.1:8000/tours/', {
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
      const res = await fetch('http://127.0.0.1:8000/performances/', {
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

  const handleSearchSetlist = async () => {
    if (!importQuery.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/external/setlistfm/search?artist_name=${encodeURIComponent(importQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setImportResults(data.setlist || []);
        setSelectedSetlists(new Set()); // Reset selections
      }
    } catch (err) { console.error(err); }
  };

  const handleImportSetlist = async (setlistId: string) => {
    setImporting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/external/setlistfm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleBulkImport = async () => {
    if (selectedSetlists.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/external/setlistfm/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_ids: Array.from(selectedSetlists) })
      });
      if (res.ok) {
        setShowSetlistImportModal(false);
        fetchData(); // Reload table
      }
    } catch (err) { console.error(err); }
    finally { setImporting(false); }
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
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
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
              {filteredTours.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>ツアーがありません。</div>}
            </div>
          )}

          {activeTab === 'singles' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredSingles.map(perf => (
                <Link key={`perf-${perf.id}`} to={`/performances/${perf.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--warning-bg)', padding: '2px 8px', borderRadius: '12px' }}>
                        {perf.event_type}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{perf.date}</span>
                    </div>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', lineHeight: '1.4' }}>{perf.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} />
                        <span>{perf.main_artist ? perf.main_artist.name : 'Unknown Artist'}</span>
                      </div>
                      {perf.venue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={16} />
                          <span>{perf.venue.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              {filteredSingles.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>単発ライブがありません。</div>}
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
            {importing && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '12px', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', color: 'white'
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--spotify-color)',
                        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px'
                    }} />
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <h3 style={{ margin: 0 }}>インポート中...</h3>
                    <p style={{ marginTop: '8px', color: '#ccc' }}>データ量により数十秒かかる場合があります</p>
                </div>
            )}
            
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
              <button
                onClick={handleSearchSetlist}
                style={{ padding: '0 24px', borderRadius: '8px', background: 'var(--spotify-color)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                検索
              </button>
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
                        <button
                        onClick={() => handleImportSetlist(sl.id)}
                        disabled={importing}
                        style={{ padding: '8px 16px', borderRadius: '16px', background: 'var(--spotify-color)', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                        インポート
                        </button>
                    )}
                  </div>
                );
              })}
              {importResults.length === 0 && importQuery && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>検索結果がありません</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <div>
                  {importMode === 'bulk' && (
                      <button
                        onClick={handleBulkImport}
                        disabled={importing || selectedSetlists.size === 0}
                        style={{ 
                            padding: '10px 24px', borderRadius: '24px', background: 'var(--spotify-color)', color: '#fff', border: 'none', 
                            cursor: (importing || selectedSetlists.size === 0) ? 'not-allowed' : 'pointer',
                            opacity: (importing || selectedSetlists.size === 0) ? 0.5 : 1
                        }}
                      >
                        選択した {selectedSetlists.size}件 をインポート
                      </button>
                  )}
              </div>
              <button
                onClick={() => setShowSetlistImportModal(false)}
                style={{ padding: '10px 20px', borderRadius: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
              >
                閉じる
              </button>
            </div>
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
    </div>
  );
};

export default Concerts;
