import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Disc3, Clock, Calendar } from 'lucide-react';

interface Song {
  id: number;
  title: string;
}

interface AlbumTrack {
  id: number;
  song_id: number;
  track_number: number;
  disc_number: number;
  duration_ms?: number;
  song: Song;
}

interface AlbumDetailData {
  id: number;
  main_title: string;
  version_title?: string;
  artist_id?: number;
  physical_release_date?: string;
  digital_release_date?: string;
  cover_image_url?: string;
  album_type?: string;
  album_tracks: AlbumTrack[];
}

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<AlbumDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/albums/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Album not found");
        return res.json();
      })
      .then(data => {
        // トラックリストをディスク順、トラック順にソートする
        if (data.album_tracks) {
          data.album_tracks.sort((a: AlbumTrack, b: AlbumTrack) => {
            if (a.disc_number !== b.disc_number) return a.disc_number - b.disc_number;
            return a.track_number - b.track_number;
          });
        }
        setAlbum(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ padding: '32px' }}>読み込み中...</div>;
  if (!album) return <div style={{ padding: '32px' }}>アルバムが見つかりませんでした。</div>;

  const releaseDate = album.physical_release_date || album.digital_release_date || '発売日不明';

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', marginBottom: '32px', fontSize: '1rem',
          padding: 0
        }}
      >
        <ArrowLeft size={20} />
        戻る
      </button>

      {/* ヘッダーエリア */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '48px', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '280px', height: '280px', 
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '12px',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {album.cover_image_url ? (
            <img src={album.cover_image_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Disc3 size={80} color="var(--text-tertiary)" />
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <span style={{ 
            fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', 
            color: 'var(--text-secondary)', letterSpacing: '0.1em'
          }}>
            {album.album_type === 'single' ? 'Single' : album.album_type === 'dvd' ? 'Video' : 'Album'}
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {album.main_title}
          </h1>
          {album.version_title && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--accent-primary)', margin: 0 }}>
              {album.version_title}
            </h2>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} />
              {releaseDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Disc3 size={18} />
              {album.album_tracks.length} Tracks
            </span>
          </div>
        </div>
      </div>

      {/* トラックリスト */}
      <div>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>
          収録曲
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {album.album_tracks.map((track, idx) => (
            <Link key={track.id} to={`/songs/${track.song_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '8px', transition: 'background-color 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ color: 'var(--text-tertiary)', fontWeight: 600, width: '24px', textAlign: 'right' }}>
                    {track.track_number}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: '1.05rem' }}>
                    {track.song.title}
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {track.disc_number > 1 && (
                    <span style={{ fontSize: '0.85rem', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                      Disc {track.disc_number}
                    </span>
                  )}
                  {track.duration_ms && (
                    <span style={{ width: '48px', textAlign: 'right' }}>
                      {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {album.album_tracks.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              収録曲が登録されていません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;
