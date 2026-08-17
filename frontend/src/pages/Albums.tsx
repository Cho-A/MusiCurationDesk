import { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import AlbumCard from '../components/AlbumCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { API_BASE_URL } from '../api/config';

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
  
  // Sort & Filter states
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/album-groups/`)
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

  let filteredAlbums = albums.filter(album => 
    album.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (typeFilters.length > 0) {
    filteredAlbums = filteredAlbums.filter(album => typeFilters.includes(album.album_type || ''));
  }

  filteredAlbums.sort((a, b) => {
    const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
    const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleFilter = (type: string) => {
    if (typeFilters.includes(type)) {
      setTypeFilters(typeFilters.filter(t => t !== type));
    } else {
      setTypeFilters([...typeFilters, type]);
    }
  };

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => toggleFilter('album')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: typeFilters.includes('album') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: typeFilters.includes('album') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            アルバム
          </button>
          <button
            onClick={() => toggleFilter('single')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: typeFilters.includes('single') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: typeFilters.includes('single') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            シングル
          </button>
          <button
            onClick={() => toggleFilter('dvd')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: typeFilters.includes('dvd') ? 'var(--primary-color)' : 'var(--bg-secondary)', color: typeFilters.includes('dvd') ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            映像作品
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="desc">発売日が新しい順</option>
            <option value="asc">発売日が古い順</option>
          </select>
        </div>
      </div>

      {filteredAlbums.length === 0 ? (
        <EmptyState icon={Disc3} title="アルバムが見つかりませんでした" description="別のキーワードで検索するか、新しくアルバムを追加してください。" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
          {filteredAlbums.map((group) => (
            <AlbumCard key={group.id} album={{
              id: group.id,
              main_title: group.title,
              cover_image_url: group.cover_image_url,
              release_date: group.release_date
            }} layout="vertical" to={`/album-groups/${group.id}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Albums;
