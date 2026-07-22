import React, { useState } from 'react';
import { Plus, X, User } from 'lucide-react';

interface Credit {
  artist_id: number;
  artist_name: string;
  role_category: string;
  role_detail?: string;
}

interface SongCreditEditorProps {
  songId: number;
  existingCredits: Credit[];
  onAddCredit: (artistName: string, category: string, detail?: string) => void;
  onRemoveCredit: (artistId: number, category: string, detail?: string) => void;
}

const CATEGORIES = [
  'Vocal', 'Guitar', 'Bass', 'Drums & Percussion',
  'Keyboard & Synth', 'Strings', 'Brass & Woodwinds',
  'Producer', 'Arranger', 'Composer', 'Lyricist', 'Other Instrument'
];

const SongCreditEditor: React.FC<SongCreditEditorProps> = ({ existingCredits, onAddCredit, onRemoveCredit }) => {
  const [newArtistName, setNewArtistName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [newDetail, setNewDetail] = useState('');

  const handleAdd = () => {
    if (!newArtistName.trim()) return;
    onAddCredit(newArtistName, selectedCategory, newDetail);
    setNewArtistName('');
    setNewDetail('');
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)',
      marginTop: '24px'
    }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={20} />
        クレジット編集
      </h3>

      {/* 既存クレジットのリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {existingCredits.map((credit, idx) => (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontWeight: 600, minWidth: '150px' }}>{credit.artist_name}</span>
              <span style={{
                background: 'rgba(29, 185, 84, 0.2)', color: 'var(--spotify-color)',
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem'
              }}>
                {credit.role_category}
              </span>
              {credit.role_detail && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ({credit.role_detail})
                </span>
              )}
            </div>
            <button
              onClick={() => onRemoveCredit(credit.artist_id, credit.role_category, credit.role_detail)}
              style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        ))}
        {existingCredits.length === 0 && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', padding: '12px 0' }}>
            クレジット情報がまだありません。
          </div>
        )}
      </div>

      {/* 新規クレジット追加フォーム */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
        padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <input
          type="text"
          placeholder="アーティスト名"
          value={newArtistName}
          onChange={(e) => setNewArtistName(e.target.value)}
          style={{
            flex: 2, minWidth: '150px', padding: '10px 14px', borderRadius: '6px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', outline: 'none'
          }}
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '6px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', outline: 'none'
          }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="詳細 (例: Acoustic, 12-string)"
          value={newDetail}
          onChange={(e) => setNewDetail(e.target.value)}
          style={{
            flex: 2, minWidth: '150px', padding: '10px 14px', borderRadius: '6px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', outline: 'none'
          }}
        />

        <button
          onClick={handleAdd}
          style={{
            background: 'var(--spotify-color)', color: 'black', fontWeight: 600,
            padding: '10px 20px', borderRadius: '24px', border: 'none',
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          追加
        </button>
      </div>
    </div>
  );
};

export default SongCreditEditor;
