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
  
  // 新規タグ作成用
  const [newTagName, setNewTagName] = useState('');

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

  const handleCreateNewTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setLoading(true);
    
    try {
      // 1. タグマスターに新規作成
      const createRes = await fetch('http://127.0.0.1:8000/tags/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: '#1DB954' }) // デフォルトカラー
      });
      
      if (createRes.ok) {
        const newTag = await createRes.json();
        setAllTags([...allTags, newTag]);
        
        // 2. 作成したタグをこの曲に紐付ける
        await handleAddTag(newTag.id);
        setNewTagName('');
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
            padding: '4px 10px', background: 'rgba(29, 185, 84, 0.1)', 
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

        {/* タグ追加ボタン */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '8px' }}>
            {/* 既存タグから選択 */}
            <select 
              onChange={(e) => {
                if (e.target.value) handleAddTag(Number(e.target.value));
              }}
              style={{ background: '#333', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
              defaultValue=""
            >
              <option value="" disabled>既存タグから選択...</option>
              {availableTags.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>または</span>
            
            {/* 新規タグ作成 */}
            <form onSubmit={handleCreateNewTag} style={{ display: 'flex', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="新しいタグ名..." 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                style={{ background: '#333', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
              />
              <button type="submit" disabled={!newTagName.trim() || loading} style={{ background: '#1DB954', color: 'black', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}>
                作成
              </button>
            </form>
            
            <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongTagEditor;
