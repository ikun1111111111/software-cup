import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { matchPageGuide, type PageGuideConfig } from '../config/pageGuide';

export type GuideState = 'idle' | 'prompting' | 'speaking' | 'questioning' | 'dismissed';

export interface PageGuideContextValue {
  currentPageId: string | null;
  config: PageGuideConfig | null;
  guideState: GuideState;
  requestGuide: () => void;
  dismissGuide: () => void;
  startSpeaking: () => void;
  openQuestion: () => void;
  closeQuestion: () => void;
  finishSpeaking: () => void;
}

const PageGuideContext = createContext<PageGuideContextValue | null>(null);

const DISMISS_KEY_PREFIX = 'guide_dismissed_';

export const PageGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [config, setConfig] = useState<PageGuideConfig | null>(null);
  const [guideState, setGuideState] = useState<GuideState>('idle');

  // 路由变化时匹配配置
  useEffect(() => {
    const matched = matchPageGuide(location.pathname);
    if (matched) {
      setConfig(matched);
      setCurrentPageId(matched.pageId);

      // 检查是否已跳过
      const dismissed = sessionStorage.getItem(`${DISMISS_KEY_PREFIX}${matched.pageId}`);
      setGuideState(dismissed ? 'dismissed' : 'prompting');
    } else {
      setConfig(null);
      setCurrentPageId(null);
      setGuideState('idle');
    }
  }, [location.pathname]);

  const requestGuide = useCallback(() => setGuideState('prompting'), []);

  const dismissGuide = useCallback(() => {
    if (currentPageId) {
      sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${currentPageId}`, '1');
    }
    setGuideState('dismissed');
  }, [currentPageId]);

  const startSpeaking = useCallback(() => setGuideState('speaking'), []);

  const finishSpeaking = useCallback(() => setGuideState('idle'), []);

  const openQuestion = useCallback(() => setGuideState('questioning'), []);

  const closeQuestion = useCallback(() => setGuideState('idle'), []);

  return (
    <PageGuideContext.Provider value={{
      currentPageId,
      config,
      guideState,
      requestGuide,
      dismissGuide,
      startSpeaking,
      openQuestion,
      closeQuestion,
      finishSpeaking,
    }}>
      {children}
    </PageGuideContext.Provider>
  );
};

export function usePageGuide(): PageGuideContextValue {
  const ctx = useContext(PageGuideContext);
  if (!ctx) throw new Error('usePageGuide must be used within PageGuideProvider');
  return ctx;
}
