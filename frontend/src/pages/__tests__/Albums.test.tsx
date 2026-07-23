import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Albums from '../Albums';

// fetchをモック化
global.fetch = vi.fn() as any;

describe('Albums Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('アルバムデータが正しく取得され、描画されること', async () => {
    const mockAlbums = [
      {
        id: 1,
        main_title: 'テストアルバム',
        album_type: 'Original'
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlbums
    });

    render(
      <BrowserRouter>
        <Albums />
      </BrowserRouter>
    );

    // APIのレスポンスが反映されているか
    await waitFor(() => {
      expect(screen.getByText('Albums')).toBeInTheDocument();
      expect(screen.getByText('テストアルバム')).toBeInTheDocument();
    });
  });
});
