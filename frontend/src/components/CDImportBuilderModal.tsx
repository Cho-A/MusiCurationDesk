import React, { useState, useEffect } from 'react';
import { X, Search, Save, AlertCircle, RefreshCw } from 'lucide-react';

interface MBTrack {
  position: number;
  number: string;
  title: string;
  length: number;
}

interface MBMedia {
  position: number;
  title?: string;
  format: string;
  track_count: number;
  tracks: MBTrack[];
}

interface MBReleaseDetail {
  id: string;
  title: string;
  date: string;
  barcode: string;
  media: MBMedia[];
}

interface SongItem {
  id: number;
  title: string;
  work_id?: number;
}

interface AlbumItem {
  id: number;
  main_title: string;
}

interface CDImportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: MBReleaseDetail | null;
}

interface TrackMatchState {
  disc_number: number;
  track_number: number;
  mb_title: string;
  song_id: number | null; // null = 未解禁曲として新規作成
  matched_title?: string;
  media_format?: string;
  notes?: string;
}

interface DiscState {
  disc_number: number;
  title: string;
  media_format: string;
  edition?: string;
}

// パフォーマンス対策として、検索クエリの入力による全体再レンダリングを防ぐための子コンポーネント
const AlbumSearchCombobox: React.FC<{
  albums: AlbumItem[];
  releaseTitle: string;
  targetAlbumId: number | 'new';
  setTargetAlbumId: (id: number | 'new') => void;
}> = ({ albums, releaseTitle, targetAlbumId, setTargetAlbumId }) => {
  const [albumSearchQuery, setAlbumSearchQuery] = useState('');
  const [isAlbumDropdownOpen, setIsAlbumDropdownOpen] = useState(false);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          placeholder="既存のアルバムにマージする場合はアルバム名で検索... (空欄で新規作成)"
          value={albumSearchQuery}
          onChange={e => {
            setAlbumSearchQuery(e.target.value);
            if (e.target.value === '') {
              setTargetAlbumId('new');
              setIsAlbumDropdownOpen(false);
            } else {
              setIsAlbumDropdownOpen(true);
            }
          }}
          onFocus={() => { if(albumSearchQuery) setIsAlbumDropdownOpen(true); }}
          style={{ 
            width: '100%', padding: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
            border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem',
            boxSizing: 'border-box'
          }}
        />
        {isAlbumDropdownOpen && (
          <div style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', 
            overflowY: 'auto', background: 'var(--bg-tertiary)', zIndex: 10, border: '1px solid var(--border-color)',
            borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            <div 
              onClick={() => {
                setTargetAlbumId('new');
                setAlbumSearchQuery('');
                setIsAlbumDropdownOpen(false);
              }}
              style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--spotify-color)' }}
            >
              ✨ [新規作成] {releaseTitle} として新しくアルバムを作る
            </div>
            {albums.filter(a => {
              // 記号や空白を除外して比較する (nullチェックを含む)
              const normalize = (str: string) => {
                if (!str) return '';
                return String(str).toLowerCase().replace(/[\s,.\-・〜~()（）]/g, '');
              };
              return normalize(a.main_title).includes(normalize(albumSearchQuery));
            }).slice(0, 50).map(a => (
              <div 
                key={a.id} 
                onClick={() => {
                  setTargetAlbumId(a.id);
                  setAlbumSearchQuery(a.main_title);
                  setIsAlbumDropdownOpen(false);
                }}
                style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
              >
                {a.main_title}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
        現在の選択: {targetAlbumId === 'new' ? <span style={{color: 'var(--spotify-color)'}}>✨ 新規作成 ({releaseTitle})</span> : <span style={{fontWeight: 'bold'}}>{albums.find(a => a.id === targetAlbumId)?.main_title}</span>}
      </div>
    </div>
  );
};

const CDImportBuilderModal: React.FC<CDImportBuilderModalProps> = ({ isOpen, onClose, release }) => {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [songs, setSongs] = useState<SongItem[]>([]);
  
  const [targetAlbumId, setTargetAlbumId] = useState<number | 'new'>('new');
  const [matches, setMatches] = useState<TrackMatchState[]>([]);
  const [discs, setDiscs] = useState<DiscState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedDiscs, setExpandedDiscs] = useState<number[]>([]); // 追加: 展開されているDiscのリスト

  // 楽曲検索サブモーダル用
  const [activeSongMatchIndex, setActiveSongMatchIndex] = useState<number | null>(null);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  // マスタデータ（アルバム一覧と楽曲一覧）をフェッチ
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchMasters = async () => {
      try {
        const [albumRes, songRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/albums/?limit=10000'), // 全アルバムをメモリに載せる
          fetch('http://127.0.0.1:8000/songs/?limit=20000') // 全曲をメモリに載せる
        ]);
        
        if (albumRes.ok && songRes.ok) {
          const albumData = await albumRes.json();
          const songData = await songRes.json();
          setAlbums(albumData);
          setSongs(songData);
          
          // 自動マッチングの実行
          if (release) {
            autoMatch(release, albumData, songData);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMasters();
  }, [isOpen, release]);

  const normalizeTitle = (title: string) => {
    if (!title) return '';
    // NFKCで正規化(全角英数を半角になど)し、記号・空白を全て除去して小文字化
    try {
      return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    } catch (e) {
      // 古いブラウザで \p{L} が使えない場合のフォールバック
      return title.toLowerCase().replace(/[\s　=\-～~・.＆&]/g, '');
    }
  };

  const autoMatch = (rel: MBReleaseDetail, availableAlbums: AlbumItem[], availableSongs: SongItem[]) => {
    const initialMatches: TrackMatchState[] = [];
    const initialDiscs: DiscState[] = [];
    
    rel.media.forEach(media => {
      initialDiscs.push({
        disc_number: media.position,
        title: media.title || '',
        media_format: media.format
      });

      media.tracks.forEach(track => {
        const normalizedMbTitle = normalizeTitle(track.title);
        // 記号などを除外した文字列で完全一致を探す
        const exactMatch = availableSongs.find(s => normalizeTitle(s.title) === normalizedMbTitle);
        
        if (exactMatch) {
          initialMatches.push({
            disc_number: media.position,
            track_number: parseInt(track.number, 10) || track.position,
            mb_title: track.title,
            song_id: exactMatch.id,
            matched_title: exactMatch.title,
            media_format: media.format
          });
        } else {
          initialMatches.push({
            disc_number: media.position,
            track_number: parseInt(track.number, 10) || track.position,
            mb_title: track.title,
            song_id: null,
            media_format: media.format
          });
        }
      });
    });
    
    setMatches(initialMatches);
    setDiscs(initialDiscs);
    
    // アルバム名も自動選択を試みる
    const matchedAlbum = availableAlbums.find(a => a.main_title.toLowerCase().includes(rel.title.toLowerCase()));
    if (matchedAlbum) {
      setTargetAlbumId(matchedAlbum.id);
    } else {
      setTargetAlbumId('new');
    }
  };

  const handleMatchChange = (discNumber: number, trackNumber: number, newSongId: number | null, newMatchedTitle: string = '') => {
    setMatches(prev => prev.map(m => 
      (m.disc_number === discNumber && m.track_number === trackNumber) 
        ? { ...m, song_id: newSongId, matched_title: newMatchedTitle } 
        : m
    ));
    setActiveSongMatchIndex(null); // モーダルを閉じる
  };

  const handleNotesChange = (discNumber: number, trackNumber: number, newNotes: string) => {
    setMatches(prev => prev.map(m => 
      (m.disc_number === discNumber && m.track_number === trackNumber) 
        ? { ...m, notes: newNotes } 
        : m
    ));
  };

  const handleDiscTitleChange = (discNumber: number, newTitle: string) => {
    setDiscs(prev => prev.map(d => 
      d.disc_number === discNumber ? { ...d, title: newTitle } : d
    ));
  };

  const handleDiscEditionChange = (discNumber: number, newEdition: string) => {
    setDiscs(prev => prev.map(d => 
      d.disc_number === discNumber ? { ...d, edition: newEdition } : d
    ));
  };

  const handleDiscFormatChange = (discNumber: number, newFormat: string) => {
    setDiscs(prev => prev.map(d => 
      d.disc_number === discNumber ? { ...d, media_format: newFormat } : d
    ));
  };

  const handleSubmit = async () => {
    if (!release) return;
    
    if (!window.confirm('この内容でCD情報（トラックリスト）を保存します。よろしいですか？\n既存のアルバムを上書きする場合、元のトラック構成は削除されます。')) return;
    
    setIsSubmitting(true);
    
    const payload = {
      target_album_id: targetAlbumId === 'new' ? null : targetAlbumId,
      title: release.title,
      release_date: release.date ? `${release.date}-01-01`.slice(0,10) : null, // 簡易的な日付パース(実際はYYYY-MM-DDを想定)
      album_type: "physical",
      discs: discs.map(d => ({
        disc_number: d.disc_number,
        title: d.title || null,
        media_format: d.media_format,
        edition: d.edition || null
      })),
      tracks: matches.map(m => ({
        disc_number: m.disc_number,
        track_number: m.track_number,
        title: m.mb_title,
        song_id: m.song_id,
        media_format: m.media_format,
        notes: m.notes || null
      }))
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/albums/import-cd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('CD情報のインポート・マージに成功しました！');
        onClose();
      } else {
        let errDetail = '保存に失敗しました';
        try {
          const errData = await res.json();
          errDetail = errData.detail || errDetail;
        } catch(e) {
          errDetail = `サーバーエラー(JSONパース失敗): HTTP ${res.status}`;
        }
        alert(`エラー: ${errDetail}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`ネットワークエラーまたは致命的なエラーが発生しました: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !release) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      padding: '40px 20px', overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#121212', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '12px',
        width: '100%', maxWidth: '900px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={24} color="#1DB954" />
              CD情報のインポート & マージ
            </h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
              MusicBrainzの情報を使って、アルバムのトラックリストを構築します。
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Step 1: ターゲットアルバムの選択 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>1. どのアルバムに保存しますか？</h3>
            <AlbumSearchCombobox 
              albums={albums} 
              releaseTitle={release.title} 
              targetAlbumId={targetAlbumId} 
              setTargetAlbumId={setTargetAlbumId} 
            />
            {targetAlbumId !== 'new' && (
              <div style={{ marginTop: '12px', color: 'var(--error-color)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                既存のアルバムを選択した場合、現在のSpotifyのトラックリストはすべて削除され、CD版のトラックリストで上書きされます。
              </div>
            )}
          </div>

          {/* Step 2: ディスク情報の確認と編集 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>2. ディスク(Media)の名称設定</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
              MusicBrainzの情報に基づき、各ディスクの名称を編集できます。単一ディスクの場合や、特に名称がない場合は空欄のままで構いません。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {discs.map((disc, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '100px', fontWeight: 'bold' }}>
                    Disc {disc.disc_number}
                    <br/>
                    <select
                      value={disc.media_format}
                      onChange={(e) => handleDiscFormatChange(disc.disc_number, e.target.value)}
                      style={{ 
                        marginTop: '4px', width: '100%', padding: '4px', fontSize: '0.8rem', 
                        backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
                        border: '1px solid var(--border-color)', borderRadius: '4px' 
                      }}
                    >
                      <option value="CD">CD</option>
                      <option value="DVD">DVD</option>
                      <option value="Blu-ray">Blu-ray</option>
                      <option value="Digital Media">Digital</option>
                      <option value="Vinyl">Vinyl</option>
                      <option value="Cassette">Cassette</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={disc.title}
                      onChange={(e) => handleDiscTitleChange(disc.disc_number, e.target.value)}
                      placeholder={`Disc ${disc.disc_number} のタイトル (例: LIVE at Nippon Budokan)`}
                      style={{ flex: 1, padding: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                    />
                    <input
                      type="text"
                      value={disc.edition || ''}
                      onChange={(e) => handleDiscEditionChange(disc.disc_number, e.target.value)}
                      placeholder="エディション (例: 初回限定盤)"
                      style={{ width: '180px', padding: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: トラックのマッチング */}
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>3. 楽曲の紐付け設定 (Track Matching)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
              CDの各トラックに対して、データベース上のどの音源を割り当てるか設定します。データベースにない曲は「✨ 新規楽曲として登録」を選択してください。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {discs.map(disc => {
                const discMatches = matches.filter(m => m.disc_number === disc.disc_number);
                const isExpanded = expandedDiscs.includes(disc.disc_number);
                
                return (
                  <div key={disc.disc_number} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div 
                      onClick={() => setExpandedDiscs(prev => isExpanded ? prev.filter(d => d !== disc.disc_number) : [...prev, disc.disc_number])}
                      style={{ 
                        padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', 
                        alignItems: 'center', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent',
                        borderRadius: isExpanded ? '8px 8px 0 0' : '8px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {disc.media_format && disc.media_format !== 'CD' ? '📺 ' : '💿 '}Disc {disc.disc_number}
                        {disc.title && <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>- {disc.title}</span>}
                        {disc.edition && <span style={{ marginLeft: '8px', fontSize: '0.8rem', background: 'var(--accent-primary)', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>{disc.edition}</span>}
                        <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({discMatches.length} Tracks)
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {isExpanded ? '▲ 閉じる' : '▼ 展開する'}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {discMatches.map((match, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', 
                            background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid #222'
                          }}>
                            <div style={{ width: '60px', color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                              Track<br/><span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{match.track_number}</span>
                            </div>
                            <div style={{ flex: 1, fontWeight: 'bold' }}>
                              {match.mb_title}
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>→</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  setActiveSongMatchIndex(matches.findIndex(m => m.disc_number === match.disc_number && m.track_number === match.track_number));
                                  setSongSearchQuery(match.mb_title);
                                }}
                                style={{ 
                                  width: '100%', padding: '10px', textAlign: 'left',
                                  backgroundColor: match.song_id === null ? 'rgba(29,185,84,0.1)' : '#222', 
                                  color: match.song_id === null ? '#1DB954' : '#fff', 
                                  border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}
                              >
                                {match.song_id === null ? '✨ [新規登録] データベースにない新しい曲として追加' : `✓ ${match.matched_title} (ID: ${match.song_id})`}
                              </button>
                              <input
                                type="text"
                                placeholder="備考 (例: MV, Live, Acoustic)"
                                value={match.notes || ''}
                                onChange={(e) => handleNotesChange(match.disc_number, match.track_number, e.target.value)}
                                style={{ padding: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.9rem' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: 'var(--bg-tertiary)' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            キャンセル
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            style={{ 
              padding: '12px 32px', background: 'var(--spotify-color)', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', 
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <Save size={18} />
            {isSubmitting ? '保存中...' : 'インポートを実行'}
          </button>
        </div>
      </div>
      
      {/* サブモーダル: 楽曲の検索・紐付け */}
      {activeSongMatchIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 2000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px',
            width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column',
            maxHeight: '80vh'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>楽曲の検索・紐付け</h3>
              <button onClick={() => setActiveSongMatchIndex(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <Search size={20} color="#888" style={{ marginTop: '10px' }} />
                <input 
                  type="text" 
                  value={songSearchQuery}
                  onChange={e => setSongSearchQuery(e.target.value)}
                  placeholder="曲名で検索..."
                  style={{ 
                    flex: 1, padding: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
                    border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem' 
                  }}
                  autoFocus
                />
              </div>
              
              <div style={{ 
                maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', 
                borderRadius: '8px', background: 'var(--bg-tertiary)' 
              }}>
                <div 
                  onClick={() => handleMatchChange(matches[activeSongMatchIndex].disc_number, matches[activeSongMatchIndex].track_number, null)}
                  style={{ 
                    padding: '16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                    color: 'var(--spotify-color)', fontWeight: 'bold'
                  }}
                >
                  ✨ [新規登録] データベースにない新しい曲として追加
                </div>
                
                {songs.filter(s => {
                  if (!songSearchQuery) return true;
                  const normQuery = normalizeTitle(songSearchQuery);
                  const normTitle = normalizeTitle(s.title);
                  return normTitle.includes(normQuery) || normQuery.includes(normTitle);
                }).slice(0, 100).map(s => (
                  <div 
                    key={s.id}
                    onClick={() => handleMatchChange(matches[activeSongMatchIndex].disc_number, matches[activeSongMatchIndex].track_number, s.id, s.title)}
                    style={{ 
                      padding: '12px 16px', borderBottom: '1px solid #222', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span>{s.title}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>ID: {s.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CDImportBuilderModal;
