import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar is fixed, so we don't put it in the flex flow directly */}
      <Sidebar isOpen={isSidebarOpen} />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: isSidebarOpen ? '260px' : '0', display: 'flex', flexDirection: 'column', transition: 'margin-left 0.3s ease' }}>
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        {/* Page Content goes here */}
        <main style={{ padding: '32px', flex: 1 }}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
