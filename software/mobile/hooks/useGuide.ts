import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectGuideStream,
  getGuideState,
  updatePreferences,
  type GuideContext,
  type GuideEvent,
  type UserGuidePreferences,
} from '@/api/guide';
import { OFFLINE_DEMO_NOTICE } from '@/constants/offline-demo';
import { getOfflineFallbackAnswer } from '@/utils/localKnowledge';

const SESSION_KEY = 'guide_session_id_v1';

function getOrCreateSessionId(): string {
  // 同步占位：实际 session 会在 useEffect 中读取异步存储；
  // 第一次调用时使用时间戳作为临时 id 避免阻塞。
  return `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface GuidePrompt {
  type: string;
  message: string;
  actions: string[];
  auto_dismiss?: number;
  spot?: any;
  suggestions?: any[];
  deviation?: number;
}

export interface GuideNarration {
  spot: any;
  text: string;
}

export interface GuideHookState {
  status: 'idle' | 'prompting' | 'narrating' | 'chatting' | 'free' | 'connecting';
  currentSpot: any | null;
  currentRoute: any | null;
  currentPrompt: GuidePrompt | null;
  narration: GuideNarration | null;
  preferences: UserGuidePreferences | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  quickQuestions: string[];
  isLoading: boolean;
  error: string | null;
  sessionId: string;
}

export interface GuideActions {
  init: (context?: GuideContext) => void;
  heartbeat: (context?: GuideContext) => void;
  dismissPrompt: (spotId?: string) => void;
  acceptPrompt: () => void;
  startNarration: (spotId: string) => void;
  endNarration: () => void;
  sendQuestion: (question: string) => void;
  updatePrefs: (updates: Partial<UserGuidePreferences>) => void;
  setDndMode: (enabled: boolean) => void;
}

const DEFAULT_QUICK_QUESTIONS = ['推荐一条游玩路线', '灵山大佛有多高？', '景区门票多少钱？'];

export function useGuide(): [GuideHookState, GuideActions] {
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const [sessionReady, setSessionReady] = useState(false);
  const disconnectRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<GuideHookState>({
    status: 'connecting',
    currentSpot: null,
    currentRoute: null,
    currentPrompt: null,
    narration: null,
    preferences: null,
    messages: [],
    quickQuestions: DEFAULT_QUICK_QUESTIONS,
    isLoading: false,
    error: null,
    sessionId: sessionIdRef.current,
  });

  // 异步加载/创建 session id
  useEffect(() => {
    (async () => {
      try {
        let id = await AsyncStorage.getItem(SESSION_KEY);
        if (!id) {
          id = `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await AsyncStorage.setItem(SESSION_KEY, id);
        }
        sessionIdRef.current = id;
      } finally {
        setSessionReady(true);
      }
    })();
  }, []);

  // 读取本地状态
  useEffect(() => {
    if (!sessionReady) return;
    getGuideState(sessionIdRef.current)
      .then((gs) => {
        setState((prev) => ({
          ...prev,
          status: gs.status || 'idle',
          currentSpot: gs.current_spot || null,
          currentRoute: gs.current_route || null,
          preferences: gs.preferences || null,
        }));
      })
      .catch(() => setState((prev) => ({ ...prev, status: 'idle' })));
  }, [sessionReady]);

  const handleEvent = useCallback((ev: GuideEvent) => {
    const { event, data } = ev;
    switch (event) {
      case 'welcome':
        setState((prev) => ({
          ...prev,
          status: 'idle',
          quickQuestions: data.quick_questions || DEFAULT_QUICK_QUESTIONS,
          messages: data.message
            ? [...prev.messages, { role: 'assistant', content: data.message }]
            : prev.messages,
        }));
        break;
      case 'state_change':
        setState((prev) => ({
          ...prev,
          status: data.to || prev.status,
          currentPrompt: data.to === 'prompting' ? prev.currentPrompt : null,
          narration: data.to === 'narrating' ? prev.narration : null,
        }));
        break;
      case 'state_sync':
        setState((prev) => ({
          ...prev,
          status: data.status || prev.status,
          currentSpot: data.current_spot || prev.currentSpot,
          currentRoute: data.current_route || prev.currentRoute,
        }));
        break;
      case 'prompt_nearby':
      case 'prompt_idle':
      case 'prompt_detour':
        setState((prev) => ({
          ...prev,
          status: 'prompting',
          currentPrompt: data,
        }));
        break;
      case 'start_narrate':
        setState((prev) => ({
          ...prev,
          status: 'narrating',
          currentSpot: data.spot,
          narration: { spot: data.spot, text: data.content?.text || '' },
        }));
        break;
      case 'end_narrate':
        setState((prev) => ({
          ...prev,
          status: 'free',
          narration: null,
        }));
        break;
      case 'suggest_route':
        setState((prev) => ({
          ...prev,
          status: 'free',
          currentRoute: data.route,
        }));
        break;
      case 'chat_reply':
        setState((prev) => ({
          ...prev,
          status: 'chatting',
          messages: [
            ...prev.messages,
            { role: 'user', content: data.question },
            { role: 'assistant', content: data.answer },
          ],
        }));
        break;
      case 'preferences_updated':
        setState((prev) => ({
          ...prev,
          preferences: data.preferences,
        }));
        break;
      case 'error':
        setState((prev) => ({ ...prev, isLoading: false, error: data.message || '向导服务异常' }));
        break;
      default:
        break;
    }
  }, []);

  const applyOfflineQuestionFallback = useCallback((question: string) => {
    const fallback = getOfflineFallbackAnswer(question);
    setState((prev) => ({
      ...prev,
      status: 'chatting',
      isLoading: false,
      error: OFFLINE_DEMO_NOTICE,
      messages: [
        ...prev.messages,
        {
          role: 'assistant',
          content: fallback.displayAnswer,
        },
      ],
    }));
  }, []);

  const sendAction = useCallback(
    (action: string, payload?: Record<string, any>) => {
      if (!sessionReady) {
        if (action === 'ask_question' && typeof payload?.question === 'string') {
          applyOfflineQuestionFallback(payload.question);
        }
        return;
      }
      disconnectRef.current?.();
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { disconnect } = connectGuideStream(
        { session_id: sessionIdRef.current, action: action as any, payload },
        handleEvent,
        (err) => {
          if (action === 'ask_question' && typeof payload?.question === 'string') {
            applyOfflineQuestionFallback(payload.question);
            return;
          }
          setState((prev) => ({ ...prev, isLoading: false, error: err.message || OFFLINE_DEMO_NOTICE }));
        },
      );
      disconnectRef.current = disconnect;

      setTimeout(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      }, 5000);
    },
    [applyOfflineQuestionFallback, handleEvent, sessionReady],
  );

  const init = useCallback((context?: GuideContext) => sendAction('init', { context }), [sendAction]);
  const heartbeat = useCallback((context?: GuideContext) => sendAction('heartbeat', { context }), [sendAction]);

  const dismissPrompt = useCallback(
    (spotId?: string) =>
      sendAction('dismiss_prompt', {
        prompt_type: state.currentPrompt?.type,
        spot_id: spotId || state.currentPrompt?.spot?.id,
      }),
    [sendAction, state.currentPrompt],
  );

  const acceptPrompt = useCallback(() => sendAction('accept_prompt'), [sendAction]);
  const startNarration = useCallback(
    (spotId: string) => sendAction('start_narrate', { spot_id: spotId }),
    [sendAction],
  );
  const endNarration = useCallback(() => sendAction('end_narrate'), [sendAction]);

  const sendQuestion = useCallback(
    (question: string) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        messages: [...prev.messages, { role: 'user', content: question }],
      }));
      sendAction('ask_question', { question });
    },
    [sendAction],
  );

  const updatePrefs = useCallback(async (updates: Partial<UserGuidePreferences>) => {
    if (!sessionReady) return;
    try {
      const prefs = await updatePreferences(sessionIdRef.current, updates);
      setState((prev) => ({ ...prev, preferences: prefs }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
    }
  }, [sessionReady]);

  const setDndMode = useCallback(
    (enabled: boolean) => updatePrefs({ dnd_mode: enabled }),
    [updatePrefs],
  );

  useEffect(() => {
    return () => disconnectRef.current?.();
  }, []);

  return [
    state,
    {
      init,
      heartbeat,
      dismissPrompt,
      acceptPrompt,
      startNarration,
      endNarration,
      sendQuestion,
      updatePrefs,
      setDndMode,
    },
  ];
}
