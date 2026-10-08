import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SmartPasteModal from '../SmartPasteModal';

describe('SmartPasteModal Auto Recalculation', () => {
  it('チェックボックスのON/OFFでトラック番号が自動的に再計算されること', async () => {
    render(
      <SmartPasteModal 
        isOpen={true} 
        onClose={vi.fn()} 
        onParseComplete={vi.fn()} 
      />
    );

    // テキストエリアに入力
    const textarea = screen.getByPlaceholderText(/BD\/DVD収録曲/);
    fireEvent.change(textarea, { target: { value: 'Track A\nTrack B\nTrack C' } });

    // 「次へ」または実行ボタンをクリック (テキストがあると活性化する)
    const runButton = screen.getByText('プレビューへ進む');
    fireEvent.click(runButton);

    // プレビュー画面が表示されたことを確認
    expect(screen.getByText('プレビューの確認と修正')).toBeInTheDocument();

    // 3つのトラックが対象としてチェックされており、番号が1, 2, 3となっているはず
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);

    const trackInputs = screen.getAllByRole('spinbutton').filter((el: any) => el.value === '1' || el.value === '2' || el.value === '3');
    // discとtrackのinputがあるので、trackInputsからtrackのものだけを特定するのは面倒ですが
    // チェックボックスを外すことで動作を確認します

    // 2曲目のチェックボックス(index 1)を外す
    fireEvent.click(checkboxes[1]);

    // これにより、Track Bは除外され、Track Cのトラック番号が 3 から 2 に再計算されるはず
    // 再計算後のトラック入力を確認 (1, 0, 2のようになるはず)
    const allNumberInputs = screen.getAllByRole('spinbutton');
    // inputs are paired: [Disc1, Track1, Disc1, Track0, Disc1, Track2]
    expect(allNumberInputs[1]).toHaveValue(1); // Track A
    expect(allNumberInputs[3]).toHaveValue(0); // Track B (excluded)
    expect(allNumberInputs[5]).toHaveValue(2); // Track C (recalculated)

    // 再度チェックを入れると 1, 2, 3 に戻るはず
    fireEvent.click(checkboxes[1]);
    const allNumberInputsAgain = screen.getAllByRole('spinbutton');
    expect(allNumberInputsAgain[1]).toHaveValue(1);
    expect(allNumberInputsAgain[3]).toHaveValue(2);
    expect(allNumberInputsAgain[5]).toHaveValue(3);
  });
});
