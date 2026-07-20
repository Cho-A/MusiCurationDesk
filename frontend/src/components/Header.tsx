import { useState, useEffect } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // 初期テーマ
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <header style={{
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Global Search Bar */}
      <div style={{ flex: 1, maxWidth: '600px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '10px 20px',
          transition: 'box-shadow 0.2s ease',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Search size={20} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="楽曲、アーティスト、ライブ、タグを検索..."
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              width: '100%', color: 'var(--text-primary)', fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* User Info */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
              fontWeight: 'bold'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>マイページ</span>
              <strong style={{ fontSize: '0.95rem' }}>{user.username}</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center',
              fontWeight: 'bold'
            }}>
              G
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ゲスト</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>未ログイン</strong>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
