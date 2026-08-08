import { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface AlbumGroup {
  id: number;
  title: string;
  cover_image_url?: string;
  release_date?: string;
  album_type?: string;
}

const Albums = () => {
  const [albums, setAlbums] = useState<AlbumGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/album-groups/')
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
    album.title.toLowerCase().includes(searchQuery.toLowerCase())
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
          {filteredAlbums.map((group) => (
            <AlbumCard key={group.id} album={{
              id: group.id,
              main_title: group.title,
              cover_image_url: group.cover_image_url,
              physical_release_date: group.release_date
            }} layout="vertical" to={`/album-groups/${group.id}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Albums;
