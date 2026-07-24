import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import SongDetail from '../SongDetail';

// fetchをモック化
globalThis.fetch = vi.fn() as any;

// useNavigateのモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

const mockSong141 = {
  id: 141,
  title: 'テスト楽曲',
  version_name: 'オリジナル',
  is_video: false,
  is_streaming_available: true,
  spotify_song_id: 'spotify141',
  work_id: 1,
  work: { id: 1, title: 'テスト楽曲', jasrac_code: null, iswc_code: null, artist_links: [] },
  artist_links: [],
  album_links: [],
  tieup_links: [],
  tags: [],
  other_versions: [
    {
      id: 20,
      title: 'テスト楽曲',
      version_name: 'AlbumMix',
      is_video: false,
      is_streaming_available: true,
      spotify_song_id: 'spotify20',
      work_id: 1,
      artist_links: [],
      album_links: [],
      tieup_links: [],
      tags: [],
    }
  ]
};

const renderSongDetail = (songId = '141') => {
  return render(
    <MemoryRouter initialEntries={[`/songs/${songId}`]}>
      <Routes>
        <Route path="/songs/:id" element={<SongDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('SongDetail: バージョン切り替えとiframeの動作', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('初期ロード時に正しい情報とiframeが表示されること', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSong141 })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderSongDetail('141');

    await waitFor(() => {
      expect(screen.getByText('楽曲 (WORK)')).toBeInTheDocument();
    });

    // iframeが正しいsrcを持っていることを確認
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toBe('https://open.spotify.com/embed/track/spotify141');
  });

  it('バージョンボタンをクリックした際、履歴を汚染せずにURL(id)を書き換えるnavigateが呼ばれること', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSong141 })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderSongDetail('141');

    await waitFor(() => {
      expect(screen.getByText(/AlbumMix/)).toBeInTheDocument();
    });

    // AlbumMixボタンをクリック
    await act(async () => {
      fireEvent.click(screen.getByText(/AlbumMix/));
    });

    // navigateが正しく replace: true で呼ばれ、履歴に積まれないことを確認
    // これによりブラウザバック時の無限ループやバグを防ぐ
    expect(mockNavigate).toHaveBeenCalledWith('/songs/20', { replace: true });
  });
});
