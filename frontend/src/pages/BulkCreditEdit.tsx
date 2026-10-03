import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Zap, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { API_BASE_URL } from '../api/config';

interface CreditBulkEditItem {
  song_id: number;
  title: string;
  lyricists: string[];
  composers: string[];
  arrangers: string[];
}

// --- 一括適用パネル ---
const ApplyToAllPanel = ({ artistId, onApplied }: { artistId: string; onApplied: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lyricists, setLyricists] = useState('');
  const [composers, setComposers] = useState('');
  const [arrangers, setArrangers] = useState('');
  const [overwriteLyricists, setOverwriteLyricists] = useState(true);
  const [overwriteComposers, setOverwriteComposers] = useState(true);
  const [overwriteArrangers, setOverwriteArrangers] = useState(true);

  const handleApply = async () => {
    setConfirmOpen(false);
    setApplying(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/credits/apply-to-artist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          artist_id: parseInt(artistId),
          lyricists: lyricists.split(',').map(s => s.trim()).filter(Boolean),
          composers: composers.split(',').map(s => s.trim()).filter(Boolean),
          arrangers: arrangers.split(',').map(s => s.trim()).filter(Boolean),
          overwrite_lyricists: overwriteLyricists,
          overwrite_composers: overwriteComposers,
          overwrite_arrangers: overwriteArrangers,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '適用に失敗しました');
      }
      const data = await res.json();
      toast.success(data.message);
      onApplied(); // テーブルを再読み込み
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const hasAnyValue = lyricists.trim() || composers.trim() || arrangers.trim();

  return (
    <div style={{
      marginBottom: '24px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 210, 0, 0.3)',
      background: 'rgba(255, 210, 0, 0.04)',
      overflow: 'hidden',
    }}>
      {/* ヘッダー */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1rem' }}>
          <Zap size={18} color="#FFD200" />
          全楽曲に一括でクレジットを適用する
        </div>
        {expanded ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            このアーティストがメインアーティストとして関わる<strong>全楽曲</strong>に、以下のクレジットを一括上書きします。<br />
            後から個別に修正することも可能です。適用しないフィールドは右端のチェックを外してください。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
            {/* 作詞 */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>作詞</label>
              <input
                type="text" value={lyricists} onChange={e => setLyricists(e.target.value)}
                disabled={!overwriteLyricists}
                placeholder="田淵智也"
                style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', opacity: overwriteLyricists ? 1 : 0.4 }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={overwriteLyricists} onChange={e => setOverwriteLyricists(e.target.checked)} />
              適用する
            </label>

            {/* 作曲 */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>作曲</label>
              <input
                type="text" value={composers} onChange={e => setComposers(e.target.value)}
                disabled={!overwriteComposers}
                placeholder="田淵智也"
                style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', opacity: overwriteComposers ? 1 : 0.4 }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={overwriteComposers} onChange={e => setOverwriteComposers(e.target.checked)} />
              適用する
            </label>

            {/* 編曲 */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>編曲</label>
              <input
                type="text" value={arrangers} onChange={e => setArrangers(e.target.value)}
                disabled={!overwriteArrangers}
                placeholder="UNISON SQUARE GARDEN"
                style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', opacity: overwriteArrangers ? 1 : 0.4 }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={overwriteArrangers} onChange={e => setOverwriteArrangers(e.target.checked)} />
              適用する
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={applying || !hasAnyValue}
              className="btn btn-primary"
              style={{ background: 'rgba(255, 210, 0, 0.85)', color: '#000', borderColor: 'transparent' }}
            >
              {applying ? <Loader2 size={16} className="spinning" /> : <Zap size={16} />}
              {applying ? '適用中...' : '全楽曲に一括適用'}
            </button>
          </div>

          {/* 確認ダイアログ */}
          {confirmOpen && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}>
              <div style={{
                background: 'var(--bg-primary)', borderRadius: '16px', padding: '32px',
                maxWidth: '480px', width: '90%', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={24} color="#FFD200" />
                  <h3 style={{ margin: 0, fontWeight: 700 }}>一括適用の確認</h3>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                  このアーティストの<strong>全楽曲</strong>に以下のクレジットを上書きします。<br />
                  この操作は元に戻せません。続行しますか？
                </p>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '14px', fontSize: '0.88rem', lineHeight: 2 }}>
                  {overwriteLyricists && <div>作詞：<strong>{lyricists || '（空欄）'}</strong></div>}
                  {overwriteComposers && <div>作曲：<strong>{composers || '（空欄）'}</strong></div>}
                  {overwriteArrangers && <div>編曲：<strong>{arrangers || '（空欄）'}</strong></div>}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setConfirmOpen(false)} className="btn btn-secondary">
                    <X size={16} /> キャンセル
                  </button>
                  <button onClick={handleApply} className="btn btn-primary"
                    style={{ background: 'rgba(255, 210, 0, 0.85)', color: '#000', borderColor: 'transparent' }}
                  >
                    <Zap size={16} /> 適用する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BulkCreditEdit: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const albumId = searchParams.get('album_id');
  const artistId = searchParams.get('artist_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CreditBulkEditItem[]>([]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (albumId) queryParams.append('album_id', albumId);
      if (artistId) queryParams.append('artist_id', artistId);

      const response = await fetch(`${API_BASE_URL}/credits/bulk-edit?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch credits');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error('クレジット情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!albumId && !artistId) {
      toast.error('アルバムIDまたはアーティストIDが必要です');
      navigate(-1);
      return;
    }
    fetchCredits();
  }, [albumId, artistId, navigate]);

  const handleStringChange = (index: number, field: 'lyricists' | 'composers' | 'arrangers', value: string) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], [field]: value.split(',').map(s => s.trim()) };
      return newItems;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/credits/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          updates: items.map(item => ({
            song_id: item.song_id,
            lyricists: item.lyricists,
            composers: item.composers,
            arrangers: item.arrangers
          }))
        })
      });
      if (!response.ok) throw new Error('Failed to update credits');
      toast.success('クレジットを一括更新しました');
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={32} className="spinning" color="#1DB954" />
      </div>
    );
  }

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> 戻る
      </button>

      <PageHeader
        title="クレジット一括編集"
        subtitle="複数人入力する場合はカンマ（,）で区切ってください。"
      />

      {/* 一括適用パネル（アーティスト指定時のみ表示）*/}
      {artistId && (
        <ApplyToAllPanel artistId={artistId} onApplied={fetchCredits} />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
          {saving ? '保存中...' : '一括保存'}
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderStyle, width: '25%' }}>楽曲名</th>
              <th style={{ ...tableHeaderStyle, width: '25%' }}>作詞 (Lyricist)</th>
              <th style={{ ...tableHeaderStyle, width: '25%' }}>作曲 (Composer)</th>
              <th style={{ ...tableHeaderStyle, width: '25%' }}>編曲 (Arranger)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.song_id}>
                <td style={tableCellStyle}>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                </td>
                <td style={tableCellStyle}>
                  <input
                    type="text"
                    value={item.lyricists.join(', ')}
                    onChange={(e) => handleStringChange(idx, 'lyricists', e.target.value)}
                    style={inputStyle}
                    placeholder="作詞者名を入力..."
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    type="text"
                    value={item.composers.join(', ')}
                    onChange={(e) => handleStringChange(idx, 'composers', e.target.value)}
                    style={inputStyle}
                    placeholder="作曲者名を入力..."
                  />
                </td>
                <td style={tableCellStyle}>
                  <input
                    type="text"
                    value={item.arrangers.join(', ')}
                    onChange={(e) => handleStringChange(idx, 'arrangers', e.target.value)}
                    style={inputStyle}
                    placeholder="編曲者名を入力..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          編集できる楽曲が見つかりませんでした。
        </div>
      )}
    </div>
  );
};

export default BulkCreditEdit;
