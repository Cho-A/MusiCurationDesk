import { createContext, useContext, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationHistoryContextValue {
  /**
   * 直前に訪問していた「別パスのURL」に遷移する。
   * クエリパラメータのみの変更（タブ切り替えなど）は「ページ遷移」とみなさないため、
   * ブラウザの履歴スタックに依存せず確実に前のページに戻ることができる。
   * 
   * パスの履歴をスタックで管理しており、goBack()を連打してもループせず、
   * 訪問したページを正しく遡る。
   */
  goBack: () => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextValue>({
  goBack: () => {},
});

export const useNavigationHistory = () => useContext(NavigationHistoryContext);

/**
 * NavigationHistoryProvider
 * 
 * URLのパス部分（pathname）が変わったときだけ履歴スタックに積む。
 * クエリパラメータ（?tab=xxx, ?version=xxx など）の変化は無視する。
 * 
 * goBack() による「戻り遷移」はスタックに積まない（isGoingBackフラグで制御）。
 * これにより、戻るボタンを連打しても A→B→A→B… のようなループが起きない。
 */
export const NavigationHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // パスの履歴をスタックで管理（先頭が最も古い）
  const pathnameStackRef = useRef<string[]>([]);
  // 現在のパスを保持（比較用）
  const currentPathnameRef = useRef<string>(location.pathname);
  // goBack() による遷移かどうかを示すフラグ
  const isGoingBackRef = useRef(false);

  // パスが変わったときの処理
  if (location.pathname !== currentPathnameRef.current) {
    if (!isGoingBackRef.current) {
      // 通常の遷移（リンククリック等）→ 現在のパスをスタックに積む
      pathnameStackRef.current.push(currentPathnameRef.current);
    }
    // goBack() による遷移の場合はスタックに積まない（pop済みのため）
    currentPathnameRef.current = location.pathname;
    isGoingBackRef.current = false;
  }

  const goBack = useCallback(() => {
    const stack = pathnameStackRef.current;
    if (stack.length > 0) {
      const prevPath = stack.pop()!;
      // フラグを立ててからナビゲートすることで、
      // 次のレンダリングでスタックに積まれるのを防ぐ
      isGoingBackRef.current = true;
      // replace: true で現在の履歴エントリを置き換え、ブラウザ履歴も汚さない
      navigate(prevPath, { replace: true });
    } else {
      // スタックが空の場合（直接URLアクセスなど）はブラウザの戻るにフォールバック
      navigate(-1);
    }
  }, [navigate]);

  return (
    <NavigationHistoryContext.Provider value={{ goBack }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
};
