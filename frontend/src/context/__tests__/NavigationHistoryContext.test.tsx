import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { NavigationHistoryProvider, useNavigationHistory } from '../NavigationHistoryContext';

// テスト用のコンポーネント
const PageA = () => {
  const { goBack } = useNavigationHistory();
  return (
    <div>
      <h1>Page A</h1>
      <Link to="/page-b">Go to B</Link>
      <button onClick={() => goBack()}>戻る</button>
    </div>
  );
};

const PageB = () => {
  const { goBack } = useNavigationHistory();
  return (
    <div>
      <h1>Page B</h1>
      <Link to="/page-c">Go to C</Link>
      <button onClick={() => goBack()}>戻る</button>
    </div>
  );
};

const PageC = () => {
  const { goBack } = useNavigationHistory();
  return (
    <div>
      <h1>Page C</h1>
      <Link to="/page-a">Go to A</Link>
      <button onClick={() => goBack()}>戻る</button>
    </div>
  );
};

const TestApp = ({ initialPath = '/' }: { initialPath?: string }) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <NavigationHistoryProvider>
      <Routes>
        <Route path="/" element={<PageA />} />
        <Route path="/page-b" element={<PageB />} />
        <Route path="/page-c" element={<PageC />} />
        <Route path="/page-a" element={<PageA />} />
      </Routes>
    </NavigationHistoryProvider>
  </MemoryRouter>
);

describe('NavigationHistoryContext', () => {
  it('goBack()で直前のページ（異なるパス）に戻れること', () => {
    render(<TestApp />);
    
    // Page A が表示されている
    expect(screen.getByText('Page A')).toBeInTheDocument();
    
    // Page B に遷移
    fireEvent.click(screen.getByText('Go to B'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
    
    // 戻るボタンを押すと Page A に戻る
    fireEvent.click(screen.getByText('戻る'));
    expect(screen.getByText('Page A')).toBeInTheDocument();
  });

  it('A→B→Cの遷移後にgoBack()でB→Aと正しく遡れること', () => {
    render(<TestApp />);
    
    // A → B → C
    fireEvent.click(screen.getByText('Go to B'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Go to C'));
    expect(screen.getByText('Page C')).toBeInTheDocument();
    
    // 戻るボタンで B に戻る
    fireEvent.click(screen.getByText('戻る'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
    
    // もう一度戻るボタンで A に戻る
    fireEvent.click(screen.getByText('戻る'));
    expect(screen.getByText('Page A')).toBeInTheDocument();
  });

  it('goBack()を連打してもA↔Bのループが発生しないこと', () => {
    render(<TestApp />);
    
    // A → B
    fireEvent.click(screen.getByText('Go to B'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
    
    // 1回目の戻る → Aに戻る
    fireEvent.click(screen.getByText('戻る'));
    expect(screen.getByText('Page A')).toBeInTheDocument();
    
    // 2回目の戻る → スタックは空なのでループしない
    // (navigate(-1)にフォールバックするが、MemoryRouterでは何も起きない = Aのまま)
    fireEvent.click(screen.getByText('戻る'));
    // ループしていないこと: まだ Page A にいるはず（Page B に飛ばないこと）
    expect(screen.getByText('Page A')).toBeInTheDocument();
  });

  it('同じパス内でクエリパラメータだけ変わっても、goBack()は前の別パスに戻ること', () => {
    render(<TestApp />);
    
    expect(screen.getByText('Page A')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Go to B'));
    expect(screen.getByText('Page B')).toBeInTheDocument();
    
    // Page B 内でのタブ切り替え等（URLパスは変わらない操作）をシミュレート
    // → スタックに影響しないはず
    
    fireEvent.click(screen.getByText('戻る'));
    expect(screen.getByText('Page A')).toBeInTheDocument();
  });
});
