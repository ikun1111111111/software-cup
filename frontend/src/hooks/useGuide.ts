import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectGuideStream,
  getGuideState,
  updatePreferences,
  type GuideContext,
  type GuideEvent,
  type UserGuidePreferences,
} from '../services/guideApi';

const SESSION_KEY = 'guide_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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
  });

  // 读取本地偏好与状态
  useEffect(() => {
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
      .catch(() => {
        setState((prev) => ({ ...prev, status: 'idle' }));
      });
  }, []);

  const handleEvent = useCallback((ev: GuideEvent) => {
    const { event, data } = ev;
    switch (event) {
      case 'welcome':
        setState((prev) => ({
          ...prev,
          status: 'idle',
          quickQuestions: data.quick_questions || DEFAULT_QUICK_QUESTIONS,
          messages: [
            ...prev.messages,
            { role: 'assistant', content: data.message },
          ],
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

  const sendAction = useCallback(
    (action: string, payload?: Record<string, any>) => {
      // 断开之前的 SSE 连接，保证每次请求独立
      disconnectRef.current?.();
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { disconnect } = connectGuideStream(
        { session_id: sessionIdRef.current, action: action as any, payload },
        handleEvent,
        (err) => setState((prev) => ({ ...prev, isLoading: false, error: err.message })),
      );
      disconnectRef.current = disconnect;

      // 大多数请求会很快完成，设置一个最大等待后重置 loading
      setTimeout(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      }, 5000);
    },
    [handleEvent],
  );

  const init = useCallback(
    (context?: GuideContext) => sendAction('init', { context }),
    [sendAction],
  );

  const heartbeat = useCallback(
    (context?: GuideContext) => sendAction('heartbeat', { context }),
    [sendAction],
  );

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
        messages: [...prev.messages, { role: 'user', content: question }],
      }));
      sendAction('ask_question', { question });
    },
    [sendAction],
  );

  const updatePrefs = useCallback(
    async (updates: Partial<UserGuidePreferences>) => {
      try {
        const prefs = await updatePreferences(sessionIdRef.current, updates);
        setState((prev) => ({ ...prev, preferences: prefs }));
      } catch (err: any) {
        setState((prev) => ({ ...prev, error: err.message }));
      }
    },
    [],
  );

  const setDndMode = useCallback(
    (enabled: boolean) => updatePrefs({ dnd_mode: enabled }),
    [updatePrefs],
  );

  // 组件卸载时断开 SSE
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
