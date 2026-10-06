import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Music, Users, BarChart3, Settings, Disc3, User, LogOut, LogIn, UserPlus, Shield, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen = true, closeSidebar }: { isOpen?: boolean, closeSidebar?: () => void }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'ホーム', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: '楽曲', icon: <Music size={20} />, path: '/songs' },
    { name: 'アルバム', icon: <Disc3 size={20} />, path: '/albums' },
    { name: 'アーティスト', icon: <Users size={20} />, path: '/artists' },
    { name: '分析', icon: <BarChart3 size={20} />, path: '/analytics' },
    { name: '設定', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100dvh', // Use dynamic viewport height to prevent cutoff on mobile
      left: 0,
      top: 0,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      zIndex: 20,
      overflow: 'hidden',
    }}>

      {/* Logo + Close button — fixed at top */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 16px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--border-color)',
      }}>
        <Link
          to="/"
          onClick={() => window.innerWidth <= 900 && closeSidebar?.()}
          style={{ textDecoration: 'none', color: 'inherit', minWidth: 0, flex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #1DB954 0%, #128C3D 100%)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)'
            }}>
              <Music size={20} color="#fff" />
            </div>
            <h1 style={{
              fontSize: '1rem', fontWeight: 700, margin: 0,
              transition: 'color 0.2s', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis'
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1DB954'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
            >
              MusiCurationDesk
            </h1>
          </div>
        </Link>

        {/* Close button — always visible, not just mobile */}
        {closeSidebar && (
          <button
            onClick={closeSidebar}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '8px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation — scrollable */}
      <nav style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: '4px',
        overflowY: 'auto', padding: '12px 12px',
      }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => window.innerWidth <= 900 && closeSidebar?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px', borderRadius: '10px',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            })}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}

        {/* Developer Tools (Admin Only) */}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            onClick={() => window.innerWidth <= 900 && closeSidebar?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px', borderRadius: '10px',
              color: isActive ? '#ff6b6b' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'rgba(255,50,50,0.1)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s ease',
              marginTop: '12px',
              border: '1px solid rgba(255,107,107,0.3)',
              textDecoration: 'none',
            })}
          >
            <Shield size={20} />
            <span style={{ fontWeight: 500 }}>開発者ツール</span>
          </NavLink>
        )}
      </nav>

      {/* User Profile / Auth Area — always visible at bottom, never overflows */}
      <div style={{
        flexShrink: 0,
        padding: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {isAuthenticated && user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--bg-tertiary)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', flexShrink: 0
              }}>
                <User size={18} />
              </div>
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Logged In</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s',
                width: '100%', textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={18} />
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>ログアウト</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" state={{ from: location }} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)',
                transition: 'background 0.2s'
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <LogIn size={18} />
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>ログイン</span>
              </div>
            </Link>
            <Link to="/register" state={{ from: location }} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)',
                transition: 'background 0.2s'
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                <UserPlus size={18} />
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>新規登録</span>
              </div>
            </Link>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
          <Link to="/terms" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px',
              borderRadius: '8px', color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Shield size={14} />
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>利用規約・免責事項</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
