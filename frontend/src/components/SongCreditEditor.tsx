import React, { useState } from 'react';
import { Plus, X, User, Edit2 } from 'lucide-react';

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
  categories?: string[];
  title?: string;
}

const DEFAULT_CATEGORIES = [
  // --- 楽曲制作・アレンジ ---
  'Vocal', 'Chorus', 'Lyricist', 'Composer', 'Arranger',
  'Strings Arrangement', 'Horn Arrangement', 'Brass Arrangement', 'SE Arrangement', 'Rhythm Arrangement',
  'Producer', 'Co-Producer', 'Sound Producer', 'Director',
  
  // --- バンド楽器 ---
  'Guitar', 'Electric Guitar', 'Acoustic Guitar',
  'Bass', 'Electric Bass', 'Wood Bass',
  'Drums', 'Percussion', 'Drums & Percussion',
  'Keyboard', 'Piano', 'Synthesizer', 'Organ',
  
  // --- ストリングス ---
  'Strings', 'Violin', 'Viola', 'Cello', 'Contrabass',
  
  // --- ブラス・ウッドウィンド ---
  'Trumpet', 'Trombone', 'Saxophone', 'Alto Sax', 'Tenor Sax', 'Baritone Sax',
  'Horn', 'Flute', 'Clarinet', 'Brass & Woodwinds',
  
  // --- その他 ---
  'Programming', 'Manipulator', 'Turntable', 'Other Instrument'
];

const SongCreditEditor: React.FC<SongCreditEditorProps> = ({ existingCredits, onAddCredit, onRemoveCredit, categories = DEFAULT_CATEGORIES, title = "クレジット編集" }) => {
  const [newArtistName, setNewArtistName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newDetail, setNewDetail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAdd = () => {
    if (!newArtistName.trim()) return;
    if (!selectedCategory.trim()) return;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} />
          {title}
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {isEditing ? '完了' : <><Edit2 size={14} /> 編集</>}
        </button>
      </div>

      {/* 既存クレジットのリスト */}
      {!isEditing ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {existingCredits.map((credit, idx) => (
            <span key={idx} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: '16px',
              border: '1px solid var(--border-color)', fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--spotify-color)', fontWeight: 600 }}>{credit.role_category}</span>
              <span style={{ color: 'var(--text-primary)' }}>{credit.artist_name}</span>
              {credit.role_detail && <span style={{ color: 'var(--text-tertiary)' }}>({credit.role_detail})</span>}
            </span>
          ))}
          {existingCredits.length === 0 && (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>クレジット情報なし</span>
          )}
        </div>
      ) : (
        <>
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
        
        {/* 役割選択・入力の切り替えUI */}
        <div style={{ flex: 1, minWidth: '140px', display: 'flex', gap: '4px' }}>
          {!isCustomCategory ? (
            <select
              value={categories.includes(selectedCategory) ? selectedCategory : (selectedCategory ? 'custom' : categories[0])}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomCategory(true);
                  setSelectedCategory('');
                } else {
                  setSelectedCategory(e.target.value);
                }
              }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '6px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
              }}
            >
              <optgroup label="楽曲制作・アレンジ">
                {categories.slice(0, 10).map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="バンド楽器">
                {categories.slice(10, 23).map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="ストリングス / ブラス / その他">
                {categories.slice(23).map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="自由入力">
                <option value="custom">✍️ その他の役割 (手入力)...</option>
              </optgroup>
            </select>
          ) : (
            <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
              <input
                type="text"
                placeholder="役割を手入力"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '10px 32px 10px 14px', borderRadius: '6px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--spotify-color)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  setIsCustomCategory(false);
                  setSelectedCategory(categories[0]);
                }}
                title="リストから選ぶ"
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

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
      </>
      )}
    </div>
  );
};

export default SongCreditEditor;
