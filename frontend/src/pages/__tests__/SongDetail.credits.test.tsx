/**
 * 楽曲詳細ページのクレジット編集シナリオテスト
 *
 * コンポーネント単体ではなく SongDetail ページ全体をレンダリングし、
 * 「編集ボタンを押す → 複数追加 → 保存」という実際の操作を丸ごと再現する。
 * （props 名の不一致や未定義ハンドラによる画面クラッシュを検出するため）
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SongDetail from '../SongDetail';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const SONG_ID = 1;
const WORK_ID = 10;

const songData = {
  id: SONG_ID,
  title: 'テスト曲',
  is_video: false,
  artist_links: [{ artist_id: 5, artist_name: 'Main Band', role_category: 'Artist' }],
  tieup_links: [],
  album_links: [],
  tags: [],
  other_versions: [],
  work_id: WORK_ID,
  work: { id: WORK_ID, title: 'テスト曲', artist_links: [] },
};

type FetchCall = { url: string; method: string; body?: unknown };

let calls: FetchCall[] = [];
let nextArtistId = 100;

const jsonResponse = (data: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) } as Response);

const mockFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  calls.push({ url, method, body });

  if (method === 'GET' && new RegExp(`/songs/${SONG_ID}$`).test(url)) return jsonResponse(songData);
  if (method === 'GET' && url.includes('/artists/search')) return jsonResponse([]);
  if (method === 'POST' && /\/artists\/$/.test(url)) return jsonResponse({ id: nextArtistId++, name: body?.name });
  if (method === 'POST') return jsonResponse({});
  return jsonResponse([]);
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/songs/${SONG_ID}`]}>
      <Routes>
        <Route path="/songs/:id" element={<SongDetail />} />
      </Routes>
    </MemoryRouter>
  );

const addCreditInEditor = (editor: HTMLElement, artistName: string, category?: string) => {
  fireEvent.change(within(editor).getByPlaceholderText('アーティスト名'), { target: { value: artistName } });
  if (category) {
    fireEvent.change(within(editor).getByRole('combobox'), { target: { value: category } });
  }
  fireEvent.click(within(editor).getByRole('button', { name: /追加/ }));
};

describe('SongDetail クレジット編集シナリオ', () => {
  beforeEach(() => {
    calls = [];
    nextArtistId = 100;
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('クレジット編集ボタン → 2人追加 → 保存 で画面が消えず、2件まとめて登録される', async () => {
    renderPage();
    await screen.findAllByText('テスト曲');

    // 編集ボタンを押してもクラッシュせず、そのまま入力フォームが出る
    fireEvent.click(screen.getByTitle('クレジットを編集'));
    const editor = await screen.findByTestId('song-credit-editor');
    expect(within(editor).getByPlaceholderText('アーティスト名')).toBeInTheDocument();

    addCreditInEditor(editor, 'Guitar Person', 'Guitar');
    addCreditInEditor(editor, 'Vocal Person', 'Vocal');

    // 追加時点では通信しない（保存待ちに並ぶだけ）
    expect(within(editor).getByText('Guitar Person')).toBeInTheDocument();
    expect(within(editor).getByText('Vocal Person')).toBeInTheDocument();
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);

    fireEvent.click(within(editor).getByRole('button', { name: '保存して完了' }));

    await waitFor(() => {
      const creditPosts = calls.filter(c => c.method === 'POST' && c.url.endsWith(`/songs/${SONG_ID}/artists`));
      expect(creditPosts).toHaveLength(2);
    });
    const creditPosts = calls.filter(c => c.method === 'POST' && c.url.endsWith(`/songs/${SONG_ID}/artists`));
    expect(creditPosts.map(c => (c.body as { role_category: string }).role_category)).toEqual(['Guitar', 'Vocal']);

    // 保存後もページは表示されたまま、編集フォームは閉じる
    await waitFor(() => expect(screen.queryByTestId('song-credit-editor')).not.toBeInTheDocument());
    expect(screen.getAllByText('テスト曲').length).toBeGreaterThan(0);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('共通クレジット編集ボタン → 作詞者追加 → 保存 で作品側に登録される', async () => {
    renderPage();
    await screen.findAllByText('テスト曲');

    fireEvent.click(screen.getByTitle('共通クレジットを編集'));
    const editor = await screen.findByTestId('song-credit-editor');

    addCreditInEditor(editor, 'Lyric Writer', 'Lyricist');
    fireEvent.click(within(editor).getByRole('button', { name: '保存して完了' }));

    await waitFor(() => {
      const workPosts = calls.filter(c => c.method === 'POST' && c.url.endsWith(`/works/${WORK_ID}/artists`));
      expect(workPosts).toHaveLength(1);
      expect((workPosts[0].body as { role_category: string }).role_category).toBe('Lyricist');
    });
    expect(screen.getAllByText('テスト曲').length).toBeGreaterThan(0);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('保存待ちのまま何も追加せず閉じても通信は発生しない', async () => {
    renderPage();
    await screen.findAllByText('テスト曲');

    fireEvent.click(screen.getByTitle('クレジットを編集'));
    const editor = await screen.findByTestId('song-credit-editor');
    fireEvent.click(within(editor).getByRole('button', { name: '保存して完了' }));

    await waitFor(() => expect(screen.queryByTestId('song-credit-editor')).not.toBeInTheDocument());
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });
});
