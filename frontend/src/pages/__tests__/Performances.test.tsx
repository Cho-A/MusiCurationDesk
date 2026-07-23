import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Performances from '../Performances';

globalThis.fetch = vi.fn() as any;

describe('Performances Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('公演一覧が正しく描画されること', async () => {
    // Performances.tsxはtoursとperformancesの2つのAPIを叩く
    const mockTours = [
      { id: 1, name: 'テストツアー' }
    ];
    
    const mockPerformances = [
      {
        id: 1,
        name: 'テスト公演',
        date: '2023-01-01',
        performance_type: 'Solo',
        event_type: 'Live',
        main_artist: { name: 'テストアーティスト' }
      }
    ];

    // Promise.allで2つ叩かれるため、mockResolvedValueOnceを複数回設定
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockTours })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPerformances });

    render(
      <BrowserRouter>
        <Performances />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Concerts')).toBeInTheDocument();
      expect(screen.getByText('テストツアー')).toBeInTheDocument();
    });
  });
});
