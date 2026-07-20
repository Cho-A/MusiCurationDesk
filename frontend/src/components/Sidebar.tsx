import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, Music, Disc, Mic2, Settings, BarChart2, Library, User, LogOut, LogIn, UserPlus, LayoutDashboard, Users, CalendarDays, ShoppingBag, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'ホーム', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: '楽曲', icon: <Music size={20} />, path: '/songs' },
    { name: 'アーティスト', icon: <Users size={20} />, path: '/artists' },
    { name: 'ライブ・公演', icon: <CalendarDays size={20} />, path: '/concerts' },
    { name: 'グッズ', icon: <ShoppingBag size={20} />, path: '/merchandise' },
    { name: '分析', icon: <BarChart3 size={20} />, path: '/analytics' },
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
      top: 0
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

        <NavLink to="/settings" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: '12px',
          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
          backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
          fontWeight: isActive ? 600 : 500,
          transition: 'all 0.2s ease'
        })}>
          <Settings size={20} />
          <span style={{ fontWeight: 500 }}>Settings</span>
        </NavLink>
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
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
              <span style={{ fontWeight: 500 }}>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'white',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <LogIn size={20} />
                <span style={{ fontWeight: 500 }}>Login</span>
              </div>
            </Link>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                background: 'transparent', borderRadius: '8px', color: 'var(--text-secondary)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <UserPlus size={20} />
                <span style={{ fontWeight: 500 }}>Register</span>
              </div>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
