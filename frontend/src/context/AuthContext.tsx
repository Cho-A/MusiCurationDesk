import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

// JWTペイロードやユーザー情報の型定義 (簡易版)
interface User {
  username: string;
  is_admin?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchProfile = async (currentToken: string) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/users/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ username: data.username, is_admin: data.is_admin });
        localStorage.setItem('is_admin', data.is_admin ? 'true' : 'false');
      }
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    }
  };

  // 初回レンダリング時にローカルストレージからトークンを復元
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUsername = localStorage.getItem('username');
    const storedIsAdmin = localStorage.getItem('is_admin') === 'true';
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUser({ username: storedUsername, is_admin: storedIsAdmin });
      // 背景で最新プロフィールを取得して同期
      fetchProfile(storedToken);
    }
  }, []);

  const login = (newToken: string, username: string) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('username', username);
    setToken(newToken);
    setUser({ username, is_admin: false }); // プロフィール取得までの仮状態
    fetchProfile(newToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
