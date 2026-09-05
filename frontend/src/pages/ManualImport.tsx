import { useState } from 'react';
import { Clipboard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SmartPasteModal, { type MBReleaseDetail } from '../components/SmartPasteModal';
import CDImportBuilderModal from '../components/CDImportBuilderModal';
import { API_BASE_URL } from '../api/config';

const ManualImport = () => {
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<MBReleaseDetail | null>(null);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const navigate = useNavigate();

  const handleCreateBlankAlbum = async () => {
    try {
      setIsCreatingBlank(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/album-groups/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: '名称未設定アルバム' })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/album-groups/${data.id}`);
      } else {
        console.error('Failed to create album group');
        setIsCreatingBlank(false);
      }
    } catch (err) {
      console.error(err);
      setIsCreatingBlank(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>手動入力・カスタムインポート</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        SpotifyやMusicBrainzに存在しないDVD作品や、独自のコンピレーションアルバムなどを登録するための起点です。
      </p>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* スマートテキストインポート */}
        <div style={{ flex: '1 1 400px', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <Clipboard size={32} color="var(--text-primary)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', margin: 0 }}>スマートテキストインポート</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', flex: 1 }}>
            WikipediaやAmazon、公式サイトのトラックリストなどのテキストを貼り付けると、AIが自動で構造化してアルバムを生成します。
          </p>
          <button 
            onClick={() => setIsSmartPasteOpen(true)}
            style={{ 
              backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', 
              borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center'
            }}
          >
            <Clipboard size={18} />
            テキストを解析して作成
          </button>
        </div>

        {/* 完全手動作成 */}
        <div style={{ flex: '1 1 400px', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <Plus size={32} color="var(--text-primary)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', margin: 0 }}>空のアルバムを新規作成</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', flex: 1 }}>
            AIを使わず、完全にゼロから手動でアルバム枠を作成します。作成後に詳細画面からディスクや楽曲を1つずつ追加できます。
          </p>
          <button 
            onClick={handleCreateBlankAlbum}
            disabled={isCreatingBlank}
            style={{ 
              backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', 
              borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: isCreatingBlank ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', opacity: isCreatingBlank ? 0.5 : 1
            }}
          >
            <Plus size={18} />
            {isCreatingBlank ? '作成中...' : '空のフォームを作成'}
          </button>
        </div>
      </div>

      <SmartPasteModal 
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        onParseComplete={(fauxRelease) => {
          setIsSmartPasteOpen(false);
          setSelectedRelease(fauxRelease);
          setIsBuilderOpen(true);
        }}
      />

      <CDImportBuilderModal 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        release={selectedRelease}
      />
    </div>
  );
};

export default ManualImport;
