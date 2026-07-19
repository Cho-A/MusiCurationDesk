import { useState, useEffect } from 'react'
import './App.css'

// 1. データの型定義
interface Song {
  id: number;
  title: string;
  release_date: string | null;
}

interface ExternalTrack {
  spotify_song_id: string;
  title: string;
  artist_names: string[];
  album_name: string;
  release_date: string;
  image_url: string | null;
}

function App() {
  // 2. 状態（State）の定義
  const [songs, setSongs] = useState<Song[]>([])
  const [error, setError] = useState<string>("")
  
  // ★ 検索・ソート用のState
  const [searchMode, setSearchMode] = useState<"internal" | "external">("internal")
  const [keyword, setKeyword] = useState<string>("")   // 検索ボックスの中身
  const [sortKey, setSortKey] = useState<string>("id") // ソート順 (初期値: id)

  // 外部検索結果用のState
  const [externalTracks, setExternalTracks] = useState<ExternalTrack[]>([])
  const [isImporting, setIsImporting] = useState<boolean>(false)

  // 3. APIからデータを取得する関数
  const fetchSongs = () => {
    // クエリパラメータの組み立て
    // URLSearchParamsを使うと、?key=value&key2=value... を簡単に作れます
    const params = new URLSearchParams();
    
    if (keyword) {
      params.append("title_search", keyword);
    }
    if (sortKey) {
      params.append("sort_by", sortKey);
    }

    // fetch実行
    fetch(`http://127.0.0.1:8000/songs/?${params.toString()}`)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        console.log("Fetched internal data:", data)
        setSongs(data)
        setError("")
      })
      .catch(err => {
        console.error('Fetch error:', err)
        setError("データの取得に失敗しました")
      })
  }

  // 外部(Spotify)APIからデータを取得する関数
  const fetchExternalTracks = () => {
    if (!keyword) return;
    const params = new URLSearchParams();
    params.append("q", keyword);

    fetch(`http://127.0.0.1:8000/search/external/tracks?${params.toString()}`)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        console.log("Fetched external data:", data)
        setExternalTracks(data)
        setError("")
      })
      .catch(err => {
        console.error('Fetch error:', err)
        setError("外部APIからの取得に失敗しました")
      })
  }

  // Spotifyから楽曲をインポートする関数
  const importTrack = (spotifySongId: string) => {
    setIsImporting(true)
    fetch(`http://127.0.0.1:8000/search/external/import/track/${spotifySongId}`, {
      method: "POST"
    })
      .then(response => {
        if (!response.ok) throw new Error('Import failed');
        return response.json();
      })
      .then(data => {
        console.log("Imported successfully:", data)
        alert(`${data.title} を追加しました！`)
        // インポート成功後、内部検索モードに戻して再取得
        setSearchMode("internal")
        setKeyword("")
        fetchSongs()
      })
      .catch(err => {
        console.error('Import error:', err)
        alert("追加に失敗しました。")
      })
      .finally(() => {
        setIsImporting(false)
      })
  }

  // 4. 初回レンダリング時 & ソート順変更時にデータを再取得
  useEffect(() => {
    fetchSongs()
  }, [sortKey]) // sortKeyが変わるたびに実行される

  // 5. 画面描画
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>MusiCuration Desk</h1>
      
      {/* --- ★ モード切り替えエリア --- */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '15px' }}>
          <input 
            type="radio" 
            value="internal" 
            checked={searchMode === "internal"} 
            onChange={() => setSearchMode("internal")} 
          />
          手持ちのデータベースから検索
        </label>
        <label>
          <input 
            type="radio" 
            value="external" 
            checked={searchMode === "external"} 
            onChange={() => setSearchMode("external")} 
          />
          Spotifyから新しく探す
        </label>
      </div>

      {/* --- ★ 検索・ソートエリア --- */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        
        {/* 検索ボックス */}
        <input 
          type="text" 
          placeholder={searchMode === "internal" ? "手持ちの曲名で検索..." : "Spotifyで曲名検索..."}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '250px' }}
        />

        {/* 検索ボタン */}
        <button 
          onClick={searchMode === "internal" ? fetchSongs : fetchExternalTracks}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          検索
        </button>

        {/* ソート選択プルダウン (内部検索時のみ表示) */}
        {searchMode === "internal" && (
          <>
            <span style={{ marginLeft: 'auto' }}>並び順: </span>
            <select 
              value={sortKey} 
              onChange={(e) => setSortKey(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px' }}
            >
              <option value="id">登録順 (ID)</option>
              <option value="release_date">発売日が新しい順</option>
              <option value="title">曲名順 (あいうえお)</option>
            </select>
          </>
        )}
      </div>
      {/* ----------------------- */}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {searchMode === "internal" ? (
        <>
          <h2>🎵 手持ちの楽曲リスト ({songs.length}曲)</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {songs.map((song) => (
              <li key={song.id} style={{ 
                marginBottom: '10px', 
                borderBottom: '1px solid #eee', 
                padding: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <strong style={{ fontSize: '1.1em' }}>{song.title}</strong>
                </div>
                <div style={{ color: '#666', fontSize: '0.9em' }}>
                  {song.release_date || '発売日未定'}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2>🔍 Spotify検索結果 ({externalTracks.length}曲)</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {externalTracks.map((track) => (
              <li key={track.spotify_song_id} style={{ 
                marginBottom: '10px', 
                borderBottom: '1px solid #eee', 
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {track.image_url && <img src={track.image_url} alt="album art" style={{ width: '50px', height: '50px', borderRadius: '4px' }} />}
                  <div>
                    <strong style={{ fontSize: '1.1em', display: 'block' }}>{track.title}</strong>
                    <span style={{ color: '#666', fontSize: '0.9em' }}>{track.artist_names.join(', ')} | {track.album_name}</span>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => importTrack(track.spotify_song_id)}
                    disabled={isImporting}
                    style={{ padding: '8px 16px', backgroundColor: '#1DB954', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {isImporting ? '追加中...' : '追加する'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default App