import { NavLink, Outlet } from 'react-router-dom';
import { Database, Disc } from 'lucide-react';
import PageHeader from './PageHeader';

const AdminLayout = () => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader 
        title="開発者ツール" 
        subtitle="外部データソースからのインポート等、管理者向けの一括処理機能を提供します。" 
      />

      {/* 開発者用サブナビゲーション (タブ) */}
      <div style={{ 
        display: 'flex', gap: '8px', marginBottom: '24px',
        borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'
      }}>
        <NavLink
          to="/admin/spotify"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px',
            color: isActive ? '#fff' : 'var(--text-secondary)',
            backgroundColor: isActive ? 'var(--spotify-color)' : 'transparent',
            fontWeight: 600, transition: 'all 0.2s ease',
            textDecoration: 'none'
          })}
        >
          <Database size={18} />
          Spotify 一括インポート
        </NavLink>

        <NavLink
          to="/admin/musicbrainz"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '8px',
            color: isActive ? '#fff' : 'var(--text-secondary)',
            backgroundColor: isActive ? '#eb743b' : 'transparent', // MusicBrainz color
            fontWeight: 600, transition: 'all 0.2s ease',
            textDecoration: 'none'
          })}
        >
          <Disc size={18} />
          MusicBrainz リリース検索
        </NavLink>
      </div>

      {/* サブページを描画 */}
      <div style={{ minHeight: '60vh' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
