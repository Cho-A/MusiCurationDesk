import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { API_BASE_URL } from '../api/config';

interface Artist {
  id: number;
  name: string;
  image_url?: string | null;
  spotify_artist_id: string | null;
}

const PAGE_SIZE = 30;

// アーティスト名からグラデーションカラーを生成
const generateGradient = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 45%), hsl(${hue2}, 60%, 35%))`;
};

// 50音インデックスの定義
const KANA_INDEX = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
const KANA_MAP: Record<string, string> = {
  あ: 'あいうえお', か: 'かきくけこ', さ: 'さしすせそ',
  た: 'たちつてと', な: 'なにぬねの', は: 'はひふへほ',
  ま: 'まみむめも', や: 'やゆよ', ら: 'らりるれろ', わ: 'わをん'
};

const Artists = () => {
  const [recentArtists, setRecentArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [kanaFilter, setKanaFilter] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最近追加されたアーティストを取得（初回のみ）
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/artists/?limit=24&skip=0`)
      .then(res => res.json())
      .then(data => {
        setRecentArtists(data);
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

  // 50音フィルター変更時もページリセット
  useEffect(() => {
    setPage(1);
  }, [kanaFilter]);

  // 検索実行
  const executeSearch = useCallback(async () => {
    const isSearching = debouncedQuery.trim() !== '' || kanaFilter !== '';
    if (!isSearching) {
      setSearchResults([]);
      setTotalPages(1);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip: String((page - 1) * PAGE_SIZE),
      });
      
      // 50音フィルターはname_searchで実装（バックエンドのilike検索を活用）
      if (debouncedQuery.trim()) {
        params.append('name_search', debouncedQuery.trim());
      } else if (kanaFilter) {
        const group = KANA_MAP[kanaFilter] || kanaFilter;
        params.append('kana_group', group);
      }

      const res = await fetch(`${API_BASE_URL}/artists/?${params}`);
      if (res.ok) {
        const data: Artist[] = await res.json();
        setSearchResults(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [debouncedQuery, kanaFilter, page]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const isInSearchMode = debouncedQuery.trim() !== '' || kanaFilter !== '';

  const displayArtists = isInSearchMode ? searchResults : recentArtists;

  const ArtistCard = ({ artist }: { artist: Artist }) => (
    <Link to={`/artists/${artist.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          border: '1px solid var(--border-color)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: artist.image_url ? undefined : generateGradient(artist.name),
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Users size={28} color="rgba(255,255,255,0.9)" />
          )}
        </div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>{artist.name}</h3>
      </div>
    </Link>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', paddingBottom: '60px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Artists</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          アーティストを名前や50音で検索できます
        </p>
      </div>

      {/* 検索バー */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{
          position: 'absolute', left: '14px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none'
        }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setKanaFilter(''); }}
          placeholder="アーティスト名を検索..."
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

      {/* 50音インデックス */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '32px' }}>
        {KANA_INDEX.map(kana => (
          <button
            key={kana}
            onClick={() => {
              setKanaFilter(kanaFilter === kana ? '' : kana);
              setSearchQuery('');
            }}
            style={{
              width: '40px', height: '36px',
              borderRadius: '8px',
              border: `1px solid ${kanaFilter === kana ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: kanaFilter === kana ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: kanaFilter === kana ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: kanaFilter === kana ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {kana}
          </button>
        ))}
        <button
          onClick={() => { setKanaFilter('A'); setSearchQuery(''); }}
          style={{
            padding: '0 12px', height: '36px',
            borderRadius: '8px',
            border: `1px solid ${kanaFilter === 'A' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            background: kanaFilter === 'A' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: kanaFilter === 'A' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: kanaFilter === 'A' ? 700 : 400,
            transition: 'all 0.15s',
          }}
        >
          英字
        </button>
      </div>

      {/* コンテンツエリア */}
      {!isInSearchMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Clock size={18} color="var(--text-secondary)" />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            最近追加されたアーティスト
          </h2>
        </div>
      )}
      {isInSearchMode && (
        <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {searching ? '検索中...' : `${searchResults.length} 件ヒット`}
        </div>
      )}

      {loading && !isInSearchMode ? (
        <LoadingSpinner />
      ) : searching ? (
        <LoadingSpinner />
      ) : displayArtists.length === 0 ? (
        <EmptyState icon={Users} title={isInSearchMode ? 'アーティストが見つかりませんでした' : 'まだアーティストが登録されていません'} description="別のキーワードで検索してみてください" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {displayArtists.map(artist => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
          {/* ページネーション（検索時のみ） */}
          {isInSearchMode && totalPages > 1 && (
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
  );
};

export default Artists;
