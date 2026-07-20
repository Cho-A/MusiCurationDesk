import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';
import SongDetail from './pages/SongDetail';
import TieupDetail from './pages/TieupDetail';
import PerformanceDetail from './pages/PerformanceDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="songs" element={<Songs />} />
          <Route path="songs/:id" element={<SongDetail />} />
          <Route path="tieups/:id" element={<TieupDetail />} />
          <Route path="performances/:id" element={<PerformanceDetail />} />
          <Route path="artists" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>アーティストページ (準備中)</div>} />
          <Route path="concerts" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>ライブ・公演ページ (準備中)</div>} />
          <Route path="merchandise" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>グッズページ (準備中)</div>} />
          <Route path="analytics" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>分析ページ (準備中)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
