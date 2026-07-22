import { useState, useEffect } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';

interface TagData {
  id: number;
  name: string;
  color?: string;
  parent_id?: number;
}

interface SongTagEditorProps {
  songId: number;
  existingTags: TagData[];
  onTagsChange: (newTags: TagData[]) => void;
}

const SongTagEditor = ({ songId, existingTags, onTagsChange }: SongTagEditorProps) => {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // オートコンプリート用状態
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // すべてのタグ（マスターデータ）を取得
  useEffect(() => {
    fetch('http://127.0.0.1:8000/tags/')
      .then(res => res.json())
      .then(data => setAllTags(data))
      .catch(err => console.error("Failed to load tags", err));
  }, []);

  const handleAddTag = async (tagId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${songId}/tags/${tagId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const updatedSong = await res.json();
        onTagsChange(updatedSong.tags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsAdding(false);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/songs/${songId}/tags/${tagId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedSong = await res.json();
        onTagsChange(updatedSong.tags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewTag = async (tagName: string) => {
    if (!tagName.trim()) return;
    setLoading(true);
    
    try {
      // 1. タグマスターに新規作成
      const createRes = await fetch('http://127.0.0.1:8000/tags/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName.trim(), color: 'var(--spotify-color)' }) // デフォルトカラー
      });
      
      if (createRes.ok) {
        const newTag = await createRes.json();
        setAllTags([...allTags, newTag]);
        
        // 2. 作成したタグをこの曲に紐付ける
        await handleAddTag(newTag.id);
        setInputValue('');
        setShowSuggestions(false);
      } else {
        const err = await createRes.json();
        alert(err.detail || 'タグの作成に失敗しました');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 既存のタグのID一覧（追加候補から除外するため）
  const existingTagIds = new Set(existingTags.map(t => t.id));
  const availableTags = allTags.filter(t => !existingTagIds.has(t.id));

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        
        {/* 既存タグの表示 */}
        {existingTags.map(tag => (
          <div key={tag.id} style={{ 
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', background: 'var(--spotify-bg)', 
            border: `1px solid ${tag.color || '#1DB954'}40`,
            color: tag.color || '#1DB954', borderRadius: '16px', fontSize: '0.85rem'
          }}>
            <TagIcon size={12} />
            {tag.name}
            <button 
              onClick={() => handleRemoveTag(tag.id)}
              disabled={loading}
              style={{ 
                background: 'none', border: 'none', color: 'inherit', 
                cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.7 
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* タグ追加ボタン / 入力フィールド */}
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', background: 'rgba(255,255,255,0.05)', 
              border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text-secondary)',
              borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <Plus size={14} /> タグを追加
          </button>
        ) : (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="タグを検索・作成..." 
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoFocus
                style={{ 
                  background: 'var(--bg-tertiary)', color: 'white', 
                  border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', 
                  borderRadius: '16px', outline: 'none', fontSize: '0.9rem',
                  minWidth: '200px'
                }}
              />
              
              {/* サジェストドロップダウン */}
              {showSuggestions && inputValue && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', width: '100%', zIndex: 10,
                  maxHeight: '200px', overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {availableTags
                    .filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase()))
                    .map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => {
                          handleAddTag(t.id);
                          setInputValue('');
                          setShowSuggestions(false);
                        }}
                        style={{ 
                          padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem',
                          borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {t.name}
                      </div>
                  ))}
                  
                  {/* 一致するタグが完全に同じ名前でない場合のみ新規追加ボタンを表示 */}
                  {!availableTags.some(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
                    <div 
                      onClick={() => handleCreateNewTag(inputValue)}
                      style={{ 
                        padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem',
                        color: 'var(--accent-primary)', fontWeight: 'bold'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/>
                      "{inputValue}" を新規追加
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setIsAdding(false);
                setInputValue('');
                setShowSuggestions(false);
              }} 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongTagEditor;
