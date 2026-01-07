import { useState, useEffect } from 'react'
import './App.css'

// 1. データの型定義
interface Song {
  id: number;
  title: string;
  release_date: string | null;
}

function App() {
  // 2. 状態（State）の定義
  const [songs, setSongs] = useState<Song[]>([])
  const [error, setError] = useState<string>("")
  
  // ★ 検索・ソート用のState
  const [keyword, setKeyword] = useState<string>("")   // 検索ボックスの中身
  const [sortKey, setSortKey] = useState<string>("id") // ソート順 (初期値: id)

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
        console.log("Fetched data:", data)
        setSongs(data)
        setError("")
      })
      .catch(err => {
        console.error('Fetch error:', err)
        setError("データの取得に失敗しました")
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
          placeholder="曲名で検索..." 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        {/* 検索ボタン */}
        <button 
          onClick={fetchSongs}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          検索
        </button>

        {/* ソート選択プルダウン */}
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
      </div>
      {/* ----------------------- */}

      <h2>🎵 楽曲リスト ({songs.length}曲)</h2>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

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
    </div>
  )
}

export default App