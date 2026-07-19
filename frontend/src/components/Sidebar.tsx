import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Music, Users, CalendarDays, BarChart3, Settings, ShoppingBag } from 'lucide-react';

const Sidebar = () => {
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
      <div style={{ padding: '0 12px 32px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--accent-gradient)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: '#fff', fontWeight: 'bold'
        }}>
          M
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>MusiCurationDesk</h1>
      </div>

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
      </nav>

      {/* Footer Area */}
      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', width: '100%', color: 'var(--text-secondary)',
          fontWeight: 500, transition: 'color 0.2s ease'
        }}>
          <Settings size={20} />
          設定
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
