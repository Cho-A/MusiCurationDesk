import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import Sidebar from '../Sidebar';

// useAuthフックをモック化
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  })),
}));

import { useAuth } from '../../context/AuthContext';

describe('Sidebar Component', () => {
  it('未ログイン時にログインボタンや新規登録ボタンが表示されること', () => {
    // デフォルトのモック動作（未ログイン）
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    
    expect(screen.getByText('MusiCurationDesk')).toBeInTheDocument();
    expect(screen.getByText('ログイン')).toBeInTheDocument();
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('ログイン時にユーザー名とログアウトボタンが表示されること', () => {
    // ログイン状態にモックを上書き
    (useAuth as any).mockReturnValue({
      user: { username: 'testuser' },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('ログアウト')).toBeInTheDocument();
  });
});
