import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Music, Users, CalendarDays, ShoppingBag, BarChart3, Settings, Disc3, User, LogOut, LogIn, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen = true }: { isOpen?: boolean }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'ホーム', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: '楽曲', icon: <Music size={20} />, path: '/songs' },
    { name: 'アルバム', icon: <Disc3 size={20} />, path: '/albums' },
    { name: 'アーティスト', icon: <Users size={20} />, path: '/artists' },
    { name: 'ライブ・公演', icon: <CalendarDays size={20} />, path: '/performances' },
    { name: 'グッズ', icon: <ShoppingBag size={20} />, path: '/merchandise' },
    { name: '分析', icon: <BarChart3 size={20} />, path: '/analytics' },
    { name: '設定', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      left: 0,
      top: 0,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      zIndex: 20
    }}>
      {/* Logo Area */}
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', cursor: 'pointer' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #1DB954 0%, #128C3D 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
          }}>
            <Music size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1DB954'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
          >
            MusiCurationDesk
          </h1>
        </div>
      </Link>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '12px',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s ease'
            })}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}

        {/* Developer Tools (Admin Only) */}
        {user?.is_admin && (
          <NavLink to="/admin" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '12px',
            color: isActive ? '#ff6b6b' : 'var(--text-secondary)',
            backgroundColor: isActive ? 'rgba(255,50,50,0.1)' : 'transparent',
            fontWeight: isActive ? 600 : 500,
            transition: 'all 0.2s ease',
            marginTop: '16px',
            border: '1px solid rgba(255,107,107,0.3)'
          })}>
            <Shield size={20} color={window.location.pathname.startsWith('/admin') ? '#ff6b6b' : undefined} />
            <span style={{ fontWeight: 500 }}>開発者ツール</span>
          </NavLink>
        )}
      </nav>

      {/* User Profile / Auth Area */}
      <div style={{ 
        marginTop: 'auto', 
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {isAuthenticated && user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <User size={20} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logged In</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s', width: '100%', textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={20} />
              <span style={{ fontWeight: 500 }}>ログアウト</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <LogIn size={20} />
                <span style={{ fontWeight: 500 }}>ログイン</span>
              </div>
            </Link>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <UserPlus size={20} />
                <span style={{ fontWeight: 500 }}>新規登録</span>
              </div>
            </Link>
          </>
        )}
        
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <Link to="/terms" style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
              borderRadius: '8px', color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Shield size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>利用規約・免責事項</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
