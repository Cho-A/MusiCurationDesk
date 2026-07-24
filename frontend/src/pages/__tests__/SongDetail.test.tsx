import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SongDetail from '../SongDetail';

// fetchをモック化
globalThis.fetch = vi.fn() as any;

const mockSong141 = {
  id: 141,
  title: 'テスト楽曲',
  version_name: 'オリジナル',
  is_video: false,
  is_streaming_available: true,
  spotify_song_id: null,
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
      spotify_song_id: null,
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

describe('SongDetail: バージョン切り替え時のAPI呼び出し', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('初期ロード時に/songs/141を1回だけ呼ぶこと', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSong141 })  // /songs/141
      .mockResolvedValueOnce({ ok: true, json: async () => [] });          // /tags/

    renderSongDetail('141');

    await waitFor(() => {
      // ページがロード完了すること（Workタイトルが表示される）
      expect(screen.getByText('楽曲 (WORK)')).toBeInTheDocument();
    });

    // /songs/141 のfetchが正確に1回だけ呼ばれていること
    const songFetchCalls = (fetch as any).mock.calls.filter(
      (call: string[]) => call[0]?.includes('/songs/141')
    );
    expect(songFetchCalls).toHaveLength(1);
  });

  it('バージョンボタンをクリックしても/songs/20が呼ばれないこと', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSong141 })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderSongDetail('141');

    // ページロード完了を待つ
    await waitFor(() => {
      expect(screen.getByText('楽曲 (WORK)')).toBeInTheDocument();
    });

    // バージョンボタンが表示されるまで待つ
    // ボタンのテキストは「テスト楽曲 (AlbumMix)」の形式
    await waitFor(() => {
      expect(screen.getByText(/AlbumMix/)).toBeInTheDocument();
    });

    // 初期ロード後のfetch呼び出し回数を記録
    const callCountBeforeSwitch = (fetch as any).mock.calls.length;

    // AlbumMixボタンをクリック
    await act(async () => {
      fireEvent.click(screen.getByText(/AlbumMix/));
    });

    // バージョン切り替え後にfetchが1件も追加されていないこと
    const callCountAfterSwitch = (fetch as any).mock.calls.length;
    expect(callCountAfterSwitch).toBe(callCountBeforeSwitch);

    // 特に/songs/20が呼ばれていないこと
    const song20Calls = (fetch as any).mock.calls.filter(
      (call: string[]) => call[0]?.includes('/songs/20')
    );
    expect(song20Calls).toHaveLength(0);
  });

  it('バージョン切り替え後も/songs/141が追加で呼ばれていないこと', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSong141 })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderSongDetail('141');

    await waitFor(() => {
      expect(screen.getByText('楽曲 (WORK)')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/AlbumMix/)).toBeInTheDocument();
    });

    // AlbumMixをクリック
    await act(async () => {
      fireEvent.click(screen.getByText(/AlbumMix/));
    });

    // もう一度オリジナルをクリック
    await act(async () => {
      fireEvent.click(screen.getByText(/オリジナル/));
    });

    // /songs/141 が依然として1回だけ呼ばれていること（追加で呼ばれていない）
    const song141Calls = (fetch as any).mock.calls.filter(
      (call: string[]) => call[0]?.includes('/songs/141')
    );
    expect(song141Calls).toHaveLength(1);
  });
});
