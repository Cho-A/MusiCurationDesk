import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
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

const BulkCreditEdit: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const albumId = searchParams.get('album_id');
  const artistId = searchParams.get('artist_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CreditBulkEditItem[]>([]);

  useEffect(() => {
    if (!albumId && !artistId) {
      toast.error('アルバムIDまたはアーティストIDが必要です');
      navigate(-1);
      return;
    }

    const fetchCredits = async () => {
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

    fetchCredits();
  }, [albumId, artistId, navigate]);

  const handleStringChange = (index: number, field: 'lyricists' | 'composers' | 'arrangers', value: string) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      // We store the raw string the user typed as an array temporarily by split. 
      // It handles empty strings well.
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
              <tr key={item.song_id} style={{ transition: 'background 0.2s', ...({ '&:hover': { background: 'rgba(255,255,255,0.05)' } } as any) }}>
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
