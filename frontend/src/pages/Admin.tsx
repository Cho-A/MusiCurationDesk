import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, UserCheck, ListMusic, DownloadCloud, AlertTriangle } from 'lucide-react';

const Admin = () => {
  const { isAuthenticated, user } = useAuth();
  
  const [artistId, setArtistId] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobProgress, setJobProgress] = useState<{status: string, progress: number, message: string, type?: string} | null>(null);
  const [error, setError] = useState('');

  // ジョブ進捗のポーリング関数
  const pollJobProgress = async (jobId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/search/external/import/progress/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job progress');
      const data = await res.json();
      setJobProgress(data);
      
      if (data.status === 'running' || data.status === 'queued') {
        setTimeout(() => pollJobProgress(jobId), 1000); // 1秒ごとにポーリング
      } else if (data.status === 'completed' || data.status === 'failed') {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error polling progress');
      setLoading(false);
    }
  };

  // 簡易的な権限チェック（本来はバックエンドでロールチェックすべき）
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={48} color="#ff6b6b" style={{ marginBottom: '16px' }} />
        <h2>アクセス拒否</h2>
        <p>開発者ツールにアクセスするにはログインが必要です。</p>
      </div>
    );
  }

  const handleArtistImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId) return;
    
    setLoading(true);
    setError('');
    setJobProgress(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/search/external/import/artist/${artistId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Artist import request failed');
      const data = await res.json();
      if (data.job_id) {
        pollJobProgress(data.job_id);
      }
    } catch (err: any) {
      setError(err.message || 'Error importing artist');
      setLoading(false);
    }
  };

  const handlePlaylistImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistId) return;
    
    setLoading(true);
    setError('');
    setJobProgress(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/search/external/import/playlist/${playlistId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Playlist import request failed');
      const data = await res.json();
      if (data.job_id) {
        pollJobProgress(data.job_id);
      }
    } catch (err: any) {
      setError(err.message || 'Error importing playlist');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--error-bg)', padding: '12px', borderRadius: '12px' }}>
          <Database size={32} color="#ff6b6b" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>開発者ツール (Dev Tools)</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            データの一括インポート・管理ユーティリティ。ログインユーザー: <span style={{ color: 'var(--text-primary)' }}>{user?.username}</span>
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'var(--error-bg)', border: '1px solid rgba(255, 50, 50, 0.3)', borderRadius: '8px', color: 'var(--error-color)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {jobProgress && (
        <div style={{ padding: '20px', background: 'var(--spotify-bg)', border: '1px solid rgba(29, 185, 84, 0.3)', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: jobProgress.status === 'failed' ? '#ff6b6b' : '#1DB954' }}>
            <DownloadCloud size={20} /> 
            {jobProgress.status === 'running' ? 'インポート実行中...' : jobProgress.status === 'completed' ? 'インポート完了' : jobProgress.status === 'failed' ? 'インポート失敗' : '待機中'}
          </h3>
          
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ 
              width: `${jobProgress.progress}%`, height: '100%', 
              background: jobProgress.status === 'failed' ? '#ff6b6b' : '#1DB954',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span>{jobProgress.message}</span>
            <span>{jobProgress.progress}%</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Artist Bulk Import Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserCheck size={24} color="#1DB954" />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>アーティスト一括インポート</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            SpotifyのArtist IDを入力すると、そのアーティストの全アルバムと全楽曲を自動でデータベースに取り込みます。(例: 1Ffb6ejR6Fe5IamqA5oRUF)
          </p>
          <form onSubmit={handleArtistImport} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Spotify Artist ID" 
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '0 24px', borderRadius: '8px', background: 'var(--spotify-color)', color: '#000', fontWeight: 600, border: 'none', cursor: loading ? 'wait' : 'pointer'
            }}>
              {loading ? 'インポート中...' : 'インポート開始'}
            </button>
          </form>
        </div>

        {/* Playlist Bulk Import Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ListMusic size={24} color="#1DB954" />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>プレイリスト一括インポート</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            SpotifyのPlaylist IDを入力すると、そこに含まれるすべての楽曲を自動でデータベースに取り込みます。(例: 37i9dQZF1DXcb6CQMEhoCS = J-ROCK ON)
          </p>
          <form onSubmit={handlePlaylistImport} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Spotify Playlist ID" 
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '0 24px', borderRadius: '8px', background: 'var(--spotify-color)', color: '#000', fontWeight: 600, border: 'none', cursor: loading ? 'wait' : 'pointer'
            }}>
              {loading ? 'インポート中...' : 'インポート開始'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Admin;
