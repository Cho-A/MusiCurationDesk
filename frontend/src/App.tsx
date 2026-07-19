import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Songs from './pages/Songs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="songs" element={<Songs />} />
          <Route path="artists" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>Artists Page (Coming Soon)</div>} />
          <Route path="concerts" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>Concerts Page (Coming Soon)</div>} />
          <Route path="analytics" element={<div style={{padding: '32px', fontSize: '1.5rem'}}>Analytics Page (Coming Soon)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
