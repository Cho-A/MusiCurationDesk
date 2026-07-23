import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Songs from '../Songs';

// fetchをモック化
globalThis.fetch = vi.fn() as any;

describe('Songs Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ローカル楽曲が0件の場合、空の状態が表示されること', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Songs />
      </BrowserRouter>
    );

    // ヘッダーが描画されているか
    expect(screen.getByText('Songs')).toBeInTheDocument();

    // APIが呼ばれるまで待機し、結果が反映されるか確認
    await waitFor(() => {
      expect(screen.getByText('楽曲が見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('ローカル楽曲が存在する場合、カードが描画されること', async () => {
    const mockSongs = [
      {
        id: 1,
        title: 'テスト楽曲',
        is_video: false,
        primary_album: { id: 1, main_title: 'テストアルバム' }
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSongs
    });

    render(
      <BrowserRouter>
        <Songs />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('テスト楽曲')).toBeInTheDocument();
      expect(screen.getByText('収録: テストアルバム')).toBeInTheDocument();
    });
  });
});
