import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '登録に失敗しました。');
      }

      // 登録成功後はログイン画面へ
      navigate('/login');
    } catch (err: any) {
      setError(err.message || '登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #1DB954 0%, #128C3D 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 24px rgba(29, 185, 84, 0.3)' }}>
              <UserPlus size={28} color="#fff" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0' }}>アカウント作成</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>MusiCurationDeskへの登録</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'var(--error-bg)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', color: 'var(--error-color)', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ユーザー名</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>メールアドレス</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>パスワード</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '8px', padding: '14px', borderRadius: '30px', background: 'var(--spotify-color)', color: '#000', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? '作成中...' : '新規登録'}
          </button>
        </form>

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          すでにアカウントをお持ちですか？ <Link to="/login" style={{ color: 'var(--spotify-color)', textDecoration: 'none', fontWeight: 600 }}>ログイン</Link>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '-8px' }}>
           <Link to="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'underline', fontSize: '0.8rem' }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
