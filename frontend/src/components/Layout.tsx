import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  // Initialize state based on window width
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 900;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 900) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Backdrop for mobile */}
      {isSidebarOpen && window.innerWidth <= 900 && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar is fixed, so we don't put it in the flex flow directly */}
      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, minWidth: 0, marginLeft: isSidebarOpen ? '260px' : '0', display: 'flex', flexDirection: 'column', transition: 'margin-left 0.3s ease' }}>
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        {/* Page Content goes here */}
        <main style={{ padding: 'min(32px, 5vw)', flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
