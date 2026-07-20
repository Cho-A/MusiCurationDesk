import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// JWTペイロードやユーザー情報の型定義 (簡易版)
interface User {
  username: string;
  // 他に必要な情報があれば追加
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

  // 初回レンダリング時にローカルストレージからトークンを復元
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUsername = localStorage.getItem('username');
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUser({ username: storedUsername });
    }
  }, []);

  const login = (newToken: string, username: string) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('username', username);
    setToken(newToken);
    setUser({ username });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
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
