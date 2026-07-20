import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';
import SongDetail from './pages/SongDetail';
import TieupDetail from './pages/TieupDetail';
import PerformanceDetail from './pages/PerformanceDetail';
import TourDetail from './pages/TourDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="songs" element={<Songs />} />
          <Route path="songs/:id" element={<SongDetail />} />
          <Route path="tieups/:id" element={<TieupDetail />} />
          <Route path="performances/:id" element={<PerformanceDetail />} />
          <Route path="tours/:id" element={<TourDetail />} />
          <Route path="artists" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>アーティストページ (準備中)</div>} />
          <Route path="concerts" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>ライブ・公演ページ (準備中)</div>} />
          <Route path="merchandise" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>グッズページ (準備中)</div>} />
          <Route path="analytics" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>分析ページ (準備中)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
