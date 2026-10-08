import { useState, useEffect, useCallback, useRef } from 'react';
import { Disc3, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  artist?: { name: string };
}

interface PaginatedResult {
  items: AlbumGroup[];
  total: number;
  page: number;
  pages: number;
}

const PAGE_SIZE = 30;

const Albums = () => {
  const [recentAlbums, setRecentAlbums] = useState<AlbumGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlbumGroup[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最近追加されたアルバムを取得（初回のみ）
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '24', skip: '0', sort_by: 'id' });
    fetch(`${API_BASE_URL}/album-groups/?${params}`)
      .then(res => res.json())
      .then(data => {
        setRecentAlbums(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 検索クエリのデバウンス
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // 検索実行（クエリ・フィルター・ページが変わるたびに）
  const executeSearch = useCallback(async () => {
    const isSearching = debouncedQuery.trim() !== '' || typeFilter !== '';
    if (!isSearching) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip: String((page - 1) * PAGE_SIZE),
      });
      if (debouncedQuery.trim()) params.append('q', debouncedQuery.trim());
      if (typeFilter) params.append('album_type', typeFilter);

      const res = await fetch(`${API_BASE_URL}/album-groups/?${params}`);
      if (res.ok) {
        const data: AlbumGroup[] = await res.json();
        setSearchResults(data);
        setSearchTotal(data.length); // Ideally should come from API but pagination isn't returning total yet
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [debouncedQuery, typeFilter, page]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const isInSearchMode = debouncedQuery.trim() !== '' || typeFilter !== '';

  const filterBtnStyle = (active: boolean) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Albums</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          アーティストやキーワードでアルバムを検索
        </p>
      </div>

      {/* 検索バー */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search
          size={18}
          style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="アルバムタイトルを検索..."
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        />
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <button style={filterBtnStyle(typeFilter === '')} onClick={() => setTypeFilter('')}>すべて</button>
        <button style={filterBtnStyle(typeFilter === 'album')} onClick={() => setTypeFilter(typeFilter === 'album' ? '' : 'album')}>アルバム</button>
        <button style={filterBtnStyle(typeFilter === 'single')} onClick={() => setTypeFilter(typeFilter === 'single' ? '' : 'single')}>シングル</button>
        <button style={filterBtnStyle(typeFilter === 'ep')} onClick={() => setTypeFilter(typeFilter === 'ep' ? '' : 'ep')}>EP</button>
        <button style={filterBtnStyle(typeFilter === 'dvd')} onClick={() => setTypeFilter(typeFilter === 'dvd' ? '' : 'dvd')}>映像作品</button>
      </div>

      {/* 検索結果モード */}
      {isInSearchMode ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              {searching ? '検索中...' : `${searchTotal} 件ヒット`}
            </p>
          </div>
          {searching ? (
            <LoadingSpinner />
          ) : searchResults.length === 0 ? (
            <EmptyState icon={Disc3} title="アルバムが見つかりませんでした" description="別のキーワードで検索してみてください" />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {searchResults.map(group => (
                  <AlbumCard key={group.id} album={{
                    id: group.id,
                    main_title: group.title,
                    cover_image_url: group.cover_image_url,
                    release_date: group.release_date
                  }} layout="vertical" to={`/album-groups/${group.id}`} />
                ))}
              </div>
              {/* ページネーション */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: page === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    前へ
                  </button>
                  <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: page === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* 検索していない場合：最近追加されたアルバム */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Clock size={18} color="var(--text-secondary)" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              最近追加されたアルバム
            </h2>
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : recentAlbums.length === 0 ? (
            <EmptyState icon={Disc3} title="まだアルバムが登録されていません" description="上の検索バーからアルバムを探すか、インポート機能を使って追加してください" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {recentAlbums.map(group => (
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
      )}
    </div>
  );
};

export default Albums;
