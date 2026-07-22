import { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

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

  if (loading) return <LoadingSpinner fullPage />;

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
        <EmptyState icon={Disc3} title="アルバムが見つかりませんでした" description="別のキーワードで検索するか、新しくアルバムを追加してください。" />
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
