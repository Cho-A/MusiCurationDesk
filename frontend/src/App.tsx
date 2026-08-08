import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';
import SongDetail from './pages/SongDetail';
import TieupDetail from './pages/TieupDetail';
import PerformanceDetail from './pages/PerformanceDetail';
import TourDetail from './pages/TourDetail';
import Performances from './pages/Performances';
import Login from './pages/Login';
import Legal from './pages/Legal';
import Register from './pages/Register';
import AdminSpotify from './pages/AdminSpotify';
import AdminLayout from './components/AdminLayout';
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Albums from './pages/Albums';
import AlbumGroupDetail from './pages/AlbumGroupDetail';
import MusicBrainzImport from './pages/MusicBrainzImport';
import Terms from './pages/Terms';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
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
          <Route path="artists" element={<Artists />} />
          <Route path="artists/:id" element={<ArtistDetail />} />
          <Route path="albums" element={<Albums />} />
          <Route path="album-groups/:id" element={<AlbumGroupDetail />} />
          <Route path="performances" element={<Performances />} />
          <Route path="merchandise" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>グッズページ (準備中)</div>} />
          <Route path="analytics" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>分析ページ (準備中)</div>} />
          {/* Admin Protected Routes */}
          <Route path="admin" element={<ProtectedRoute adminOnly={true} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminSpotify />} />
              <Route path="spotify" element={<AdminSpotify />} />
              <Route path="musicbrainz" element={<MusicBrainzImport />} />
            </Route>
          </Route>
          
          <Route path="settings" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>設定ページ (準備中)</div>} />
          <Route path="terms" element={<Terms />} />
          <Route path="legal" element={<Legal />} />
          <Route path="*" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>ページが見つかりません (404)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
