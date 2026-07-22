import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar is fixed, so we don't put it in the flex flow directly */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column' }}>
        <Header />
        
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
