import { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import AlbumCard from '../components/AlbumCard';

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
      <PageHeader 
        title="Albums" 
        subtitle="データベースに登録されているアルバムを管理します" 
        actions={
          <div style={{ color: 'var(--text-tertiary)', fontWeight: 500, paddingBottom: '8px' }}>
            {filteredAlbums.length} Albums
          </div>
        }
      />

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="アルバムを検索..."
      />

      {filteredAlbums.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px' }}>
          <Disc3 size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>まだアルバムが登録されていません。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
          {filteredAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} layout="vertical" />
          ))}
        </div>
      )}
    </div>
  );
};

export default Albums;
