import React, { useState, useEffect } from 'react';
import { Disc3, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Album {
  id: number;
  main_title: string;
  version_title?: string;
  cover_image_url?: string;
  physical_release_date?: string;
  digital_release_date?: string;
}

const Albums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/albums/')
      .then(res => res.json())
      .then(data => {
        setAlbums(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>読み込み中...</div>;
  }

  const filteredAlbums = albums.filter(album => 
    album.main_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Albums</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1.1rem' }}>データベースに登録されているアルバム</p>
        </div>
        <div style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
          {filteredAlbums.length} Albums
        </div>
      </div>

      <div style={{ marginBottom: '32px', position: 'relative', maxWidth: '600px' }}>
        <Search size={20} color="var(--text-tertiary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="アルバムを検索..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', padding: '16px 16px 16px 48px', 
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
            borderRadius: '12px', color: 'var(--text-primary)', fontSize: '1rem',
            outline: 'none'
          }}
        />
      </div>

      {filteredAlbums.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px' }}>
          <Disc3 size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>まだアルバムが登録されていません。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
          {filteredAlbums.map((album) => (
            <Link key={album.id} to={`/albums/${album.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '16px', 
              padding: '16px',
              transition: 'transform 0.2s, background-color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            >
              <div style={{ 
                width: '100%', 
                aspectRatio: '1 / 1', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.main_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Disc3 size={48} color="var(--text-tertiary)" />
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {album.main_title}
              </div>
              {album.version_title && (
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                  {album.version_title}
                </div>
              )}
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {album.physical_release_date || album.digital_release_date || '発売日不明'}
              </div>
            </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Albums;
