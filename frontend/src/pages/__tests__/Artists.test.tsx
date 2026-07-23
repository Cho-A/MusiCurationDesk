import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Artists from '../Artists';

global.fetch = vi.fn() as any;

describe('Artists Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('アーティストデータが正しく取得され、描画されること', async () => {
    const mockArtists = [
      {
        id: 1,
        name: 'テストアーティスト'
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArtists
    });

    render(
      <BrowserRouter>
        <Artists />
      </BrowserRouter>
    );

    expect(screen.getByText('Artists')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('テストアーティスト')).toBeInTheDocument();
    });
  });
});
