import { createContext, useContext, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationHistoryContextValue {
  /**
   * 直前に訪問していた「別パスのURL」に遷移する。
   * クエリパラメータのみの変更（タブ切り替えなど）は「ページ遷移」とみなさないため、
   * ブラウザの履歴スタックに依存せず確実に前のページに戻ることができる。
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
 * URLのパス部分（pathname）が変わったときだけ「前のページ」として記録する。
 * クエリパラメータ（?tab=xxx, ?version=xxx など）の変化は無視する。
 * 
 * これにより、ページ内のタブ切り替えなどが履歴を汚染しても、
 * 「戻る」ボタンは確実に直前の別ページに遷移できる。
 */
export const NavigationHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 前のパス（pathname部分のみ）を保持
  const prevPathnameRef = useRef<string | null>(null);
  // 現在のパスを保持（比較用）
  const currentPathnameRef = useRef<string>(location.pathname);

  // パスが変わったときだけ前のパスを更新
  if (location.pathname !== currentPathnameRef.current) {
    prevPathnameRef.current = currentPathnameRef.current;
    currentPathnameRef.current = location.pathname;
  }

  const goBack = useCallback(() => {
    if (prevPathnameRef.current) {
      // 前のパスが記録されていれば、そこに直接遷移
      navigate(prevPathnameRef.current);
    } else {
      // 初回アクセスなどで前のパスがない場合はブラウザの戻るにフォールバック
      navigate(-1);
    }
  }, [navigate]);

  return (
    <NavigationHistoryContext.Provider value={{ goBack }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
};
