import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectGuideStream, getGuideState } from '@/api/guide';
import type { GuideEvent as ApiGuideEvent } from '@/api/guide';
import { startTourSession } from '@/api/tour';
import { recordMobileTourEvent, type MobileTourEventName } from '@/api/analytics';
import type { UserLocation, DistanceInfo } from './useTourGeolocation';
import { checkInSpot, type CheckinResult } from './useTourCheckin';
import { getTourCompletionTransition } from '../utils/tourProgress';
import {
  DEFAULT_USER_GUIDE_PROFILE,
  getGuideStopById,
  getSoloRouteRecommendation,
} from '@/data/lingshanGuideData';
import { toTourRoute } from '@/mocks/guide';
import {
  buildSoloTourSummary,
  detectSoloDeviation,
  replanSoloRouteFromSpot,
  soloIntentToProfilePatch,
  type SoloDeviationAction,
  type SoloDeviationResult,
  type SoloRouteRecommendation,
  type SoloTourSummary,
} from '@/utils/soloTour';
import type {
  GuideIntent,
  GuideMemoryEvent,
  GuideMemoryEventInput,
  GuideRoute,
  GuideSessionState,
  UserGuideProfile,
} from '@/types/guide';

// ============ 类型定义 ============

export type TourStatus =
  | 'idle'        // 空闲：VRM静默跟随
  | 'greeting'    // 欢迎：主动欢迎用户
  | 'suggest'     // 推荐：推荐路线/景点
  | 'navigate'    // 导航：前往目标景点
  | 'attraction'  // 景点：介绍景点
  | 'narrating'   // 讲解：主动讲解景点
  | 'free'        // 自由：用户自由探索
  | 'paused'      // 暂停：保留路线，暂不主动导览
  | 'completed'   // 完成：保留路线结果，等待生成记忆总结
  | 'conversing'; // 对话：互动问答

export interface Spot {
  id: string;
  name: string;
  description?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  spots: Spot[];
  duration?: string;
  route_type?: string;
}

export interface NarrationContent {
  spot: Spot;
  text: string;
  audioUrl?: string;
  duration?: number;
}

export interface TourProgress {
  total: number;
  completed: number;
  current: number;
}

export interface TourCheckinResult extends CheckinResult {
  completedSpot: Spot;
  nextTargetSpot: Spot | null;
  previewNextSpot: Spot | null;
  isTourComplete: boolean;
}

/** 打卡数据，跨页面传递 */
export interface PendingCheckin {
  spotId: string;
  spotName: string;
  photoUri?: string;
  type: 'photo' | 'scan' | 'direct';
  timestamp: number;
}

/** 打卡意图，引导 explore 页自动打开相机/扫码 */
export type CheckinIntent = 'photo' | 'scan' | null;

export interface TourPreferences {
  mode: 'tour' | 'free'; // 导览模式 or 自由模式
  autoNarrate: boolean;
  narrationSpeed: 'slow' | 'normal' | 'fast';
  dndMode: boolean;
}

export interface SoloTourState {
  enabled: boolean;
  intent: GuideIntent | null;
  companionLevel: 'quiet' | 'balanced' | 'active';
  deviationCount: number;
  lastPromptAt?: number;
  pendingDeviation?: SoloDeviationResult | null;
  summary?: SoloTourSummary | null;
}

export interface TourState {
  sessionId: string;
  status: TourStatus;
  currentRoute: Route | null;
  currentSpot: Spot | null;
  nextSpot: Spot | null;
  progress: TourProgress;
  narration: NarrationContent | null;
  preferences: TourPreferences;
  messages: { role: 'user' | 'assistant'; content: string }[];
  isLoading: boolean;
  error: string | null;
  // GPS相关
  userLocation: UserLocation | null;
  distanceInfo: DistanceInfo | null;
  checkinResult: CheckinResult | null;
  // 打卡流程
  pendingCheckin: PendingCheckin | null;
  checkinIntent: CheckinIntent;
  // 数字人导览契约
  activeIntent: GuideIntent | null;
  guideProfile: UserGuideProfile;
  guideSession: GuideSessionState;
  memoryEvents: GuideMemoryEvent[];
  soloTour: SoloTourState;
}

type TrackTourEventOverrides = {
  route?: Route | null;
  spot?: Spot | null;
  route_id?: string | null;
  route_name?: string | null;
  spot_id?: string | null;
  spot_name?: string | null;
  source_page?: string | null;
  duration_ms?: number | null;
  latency_ms?: number | null;
  completed?: boolean;
  preferences?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

// ============ 持久化 ============

const TOUR_STORAGE_KEY = 'tour_state_v2';
const TOUR_PROGRESS_KEY = 'tour_progress_v2';
const TOUR_MODE_KEY = 'tour_mode_v2';

async function loadTourState(): Promise<Partial<TourState> | null> {
  try {
    const state = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
    if (!state) return null;
    return JSON.parse(state);
  } catch {
    return null;
  }
}

async function saveTourState(state: Partial<TourState>) {
  try {
    await AsyncStorage.mergeItem(TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略错误 */
  }
}

function cloneDefaultGuideProfile(): UserGuideProfile {
  return {
    ...DEFAULT_USER_GUIDE_PROFILE,
    interests: [...DEFAULT_USER_GUIDE_PROFILE.interests],
  };
}

function createInitialGuideSession(sessionId: string, profile = cloneDefaultGuideProfile()): GuideSessionState {
  return {
    sessionId,
    status: 'idle',
    completedStopIds: [],
    profile,
  };
}

function createGuideMemoryEvent(sessionId: string, input: GuideMemoryEventInput): GuideMemoryEvent {
  return {
    ...input,
    id: input.id ?? `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: input.sessionId ?? sessionId,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

// ============ Hook ============

export function useTourOrchestrator() {
  const sessionIdRef = useRef(`tour_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const disconnectRef = useRef<(() => void) | null>(null);
  const initialGuideProfileRef = useRef(cloneDefaultGuideProfile());

  const [state, setState] = useState<TourState>({
    sessionId: sessionIdRef.current,
    status: 'idle',
    currentRoute: null,
    currentSpot: null,
    nextSpot: null,
    progress: { total: 0, completed: 0, current: 0 },
    narration: null,
    preferences: {
      mode: 'tour',
      autoNarrate: true,
      narrationSpeed: 'normal',
      dndMode: false,
    },
    messages: [],
    isLoading: false,
    error: null,
    // GPS相关初始值
    userLocation: null,
    distanceInfo: null,
    checkinResult: null,
    // 打卡流程初始值
    pendingCheckin: null,
    checkinIntent: null,
    // 数字人导览契约初始值
    activeIntent: null,
    guideProfile: initialGuideProfileRef.current,
    guideSession: createInitialGuideSession(sessionIdRef.current, initialGuideProfileRef.current),
    memoryEvents: [],
    soloTour: {
      enabled: false,
      intent: null,
      companionLevel: initialGuideProfileRef.current.companionLevel ?? 'balanced',
      deviationCount: 0,
      pendingDeviation: null,
      summary: null,
    },
  });
  const stateRef = useRef<TourState | null>(null);
  stateRef.current = state;

  const trackTourEvent = useCallback((eventName: MobileTourEventName, overrides: TrackTourEventOverrides = {}) => {
    const snapshot = stateRef.current;
    const route = overrides.route ?? snapshot?.currentRoute ?? null;
    const spot = overrides.spot ?? snapshot?.currentSpot ?? null;

    recordMobileTourEvent({
      session_id: sessionIdRef.current,
      event_name: eventName,
      route_id: overrides.route_id ?? route?.id ?? null,
      route_name: overrides.route_name ?? route?.name ?? null,
      spot_id: overrides.spot_id ?? spot?.id ?? null,
      spot_name: overrides.spot_name ?? spot?.name ?? null,
      source_page: overrides.source_page ?? null,
      duration_ms: overrides.duration_ms ?? null,
      latency_ms: overrides.latency_ms ?? null,
      completed: overrides.completed ?? false,
      preferences: overrides.preferences ?? snapshot?.preferences ?? null,
      metadata: overrides.metadata ?? null,
    }).catch(() => {});
  }, []);

  // 加载持久化状态
  useEffect(() => {
    loadTourState().then((saved) => {
      if (saved) {
        setState((prev) => ({ ...prev, ...saved }));
      }
    });
  }, []);

  // 保存状态变化
  useEffect(() => {
    saveTourState({
      currentRoute: state.currentRoute,
      currentSpot: state.currentSpot,
      nextSpot: state.nextSpot,
      progress: state.progress,
      preferences: state.preferences,
      activeIntent: state.activeIntent,
      guideProfile: state.guideProfile,
      guideSession: state.guideSession,
      memoryEvents: state.memoryEvents,
      soloTour: state.soloTour,
    });
  }, [
    state.currentRoute,
    state.currentSpot,
    state.nextSpot,
    state.progress,
    state.preferences,
    state.activeIntent,
    state.guideProfile,
    state.guideSession,
    state.memoryEvents,
    state.soloTour,
  ]);

  // SSE 事件处理
  const handleEvent = useCallback((ev: ApiGuideEvent) => {
    const { event, data } = ev;
    switch (event) {
      case 'welcome':
        setState((prev) => ({
          ...prev,
          status: 'greeting',
          messages: data.message
            ? [...prev.messages, { role: 'assistant', content: data.message }]
            : prev.messages,
        }));
        break;

      case 'state_change':
        setState((prev) => ({
          ...prev,
          status: data.to || prev.status,
        }));
        break;

      case 'prompt_nearby':
        setState((prev) => ({
          ...prev,
          status: 'attraction',
          currentSpot: data.spot || prev.currentSpot,
        }));
        break;

      case 'start_narrate':
        setState((prev) => ({
          ...prev,
          status: 'narrating',
          currentSpot: data.spot,
          narration: {
            spot: data.spot,
            text: data.content?.text || '',
            audioUrl: data.content?.audioUrl,
            duration: data.content?.duration,
          },
        }));
        break;

      case 'end_narrate':
        setState((prev) => ({
          ...prev,
          status: 'suggest',
          narration: null,
        }));
        break;

      case 'suggest_route':
        setState((prev) => ({
          ...prev,
          status: 'suggest',
          currentRoute: data.route,
        }));
        break;

      case 'navigation_started':
        setState((prev) => ({
          ...prev,
          status: 'navigate',
          nextSpot: data.target,
        }));
        break;

      case 'spot_arrived':
        setState((prev) => ({
          ...prev,
          status: 'attraction',
          currentSpot: data.spot,
        }));
        break;

      case 'chat_reply':
        setState((prev) => ({
          ...prev,
          status: 'conversing',
          messages: [
            ...prev.messages,
            { role: 'user', content: data.question },
            { role: 'assistant', content: data.answer },
          ],
        }));
        break;

      case 'error':
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: data.message || '导览服务异常',
        }));
        break;

      default:
        break;
    }
  }, []);

  // 发送动作到后端
  const sendAction = useCallback(
    (action: string, payload?: Record<string, any>) => {
      disconnectRef.current?.();
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { disconnect } = connectGuideStream(
        { session_id: sessionIdRef.current, action: action as any, payload },
        handleEvent,
        (err) => setState((prev) => ({ ...prev, isLoading: false, error: err.message })),
      );
      disconnectRef.current = disconnect;

      setTimeout(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      }, 5000);
    },
    [handleEvent],
  );

  // ============ 动作 ============

  /** 开始导览 */
  const startTour = useCallback(
    (route: Route) => {
      const firstSpot = route.spots[0] || null;
      const nextSpot = route.spots[1] || null;
      const startEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'start_route',
        routeId: route.id,
        stopId: firstSpot?.id,
        title: `开始${route.name}`,
        content: route.description || '小灵已进入导览模式。',
      });
      trackTourEvent('tour_started', {
        route,
        spot: firstSpot,
        source_page: 'route',
        preferences: { ...stateRef.current?.preferences, mode: 'tour' },
        metadata: { total_spots: route.spots.length, route_type: route.route_type },
      });
      setState((prev) => ({
        ...prev,
        status: 'navigate',
        currentRoute: route,
        currentSpot: firstSpot,
        nextSpot,
        preferences: { ...prev.preferences, mode: 'tour' },
        guideSession: {
          ...prev.guideSession,
          status: 'navigating',
          currentStopId: firstSpot?.id,
          nextStopId: nextSpot?.id,
          completedStopIds: [],
          profile: prev.guideProfile,
        },
        memoryEvents: [...prev.memoryEvents, startEvent],
        progress: {
          total: route.spots.length,
          completed: 0,
          current: 1,
        },
      }));

      startTourSession({
        session_id: sessionIdRef.current,
        route_id: route.id,
        preferences: stateRef.current?.preferences,
      })
        .then((res) => {
          const serverRoute = res.route || route;
          const serverFirstSpot = res.first_spot || serverRoute.spots[0] || null;
          const serverNextSpot = res.next_spots?.[0] || serverRoute.spots[1] || null;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            status: 'navigate',
            currentRoute: serverRoute,
            currentSpot: serverFirstSpot,
            nextSpot: serverNextSpot,
            guideSession: {
              ...prev.guideSession,
              status: 'navigating',
              currentStopId: serverFirstSpot?.id,
              nextStopId: serverNextSpot?.id,
              completedStopIds: [],
              profile: prev.guideProfile,
            },
            progress: {
              total: serverRoute.spots.length,
              completed: 0,
              current: serverRoute.spots.length > 0 ? 1 : 0,
            },
          }));
        })
        .catch((error) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error?.message || null,
          }));
        });
    },
    [trackTourEvent],
  );

  /** 使用 M0 GuideRoute 本地启动导览，不依赖后端接口 */
  const startGuideRoute = useCallback(
    (route: GuideRoute, intent?: GuideIntent) => {
      const tourRoute = toTourRoute(route);
      const firstSpot = tourRoute.spots[0] || null;
      const nextSpot = tourRoute.spots[1] || null;
      const startEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'start_route',
        routeId: route.id,
        stopId: firstSpot?.id,
        title: `小灵开启${route.name}`,
        content: route.openingLine,
      });

      trackTourEvent('tour_started', {
        route: tourRoute,
        spot: firstSpot,
        source_page: 'explore',
        preferences: { ...stateRef.current?.preferences, mode: 'tour' },
        metadata: {
          guide_route_theme: route.theme,
          total_spots: route.stops.length,
          local_data: true,
        },
      });

      setState((prev) => ({
        ...prev,
        status: 'navigate',
        currentRoute: tourRoute,
        currentSpot: firstSpot,
        nextSpot,
        activeIntent: intent ?? (route.theme === 'free' ? 'free_walk' : route.theme),
        preferences: { ...prev.preferences, mode: 'tour' },
        soloTour: {
          ...prev.soloTour,
          enabled: true,
          intent: intent ?? (route.theme === 'free' ? 'free_walk' : route.theme),
          companionLevel: prev.guideProfile.companionLevel ?? 'balanced',
          pendingDeviation: null,
          summary: null,
        },
        progress: {
          total: route.stops.length,
          completed: 0,
          current: 1,
        },
        guideSession: {
          ...prev.guideSession,
          status: 'navigating',
          currentRoute: route,
          currentStopId: firstSpot?.id,
          nextStopId: nextSpot?.id,
          completedStopIds: [],
          profile: prev.guideProfile,
        },
        memoryEvents: [...prev.memoryEvents, startEvent],
      }));
    },
    [trackTourEvent],
  );

  const selectSoloIntent = useCallback((intent: GuideIntent) => {
    const patch = soloIntentToProfilePatch(intent);
    setState((prev) => {
      const nextProfile: UserGuideProfile = {
        ...prev.guideProfile,
        ...patch,
        interests: patch.interests ?? prev.guideProfile.interests,
        groupType: 'solo',
      };
      return {
        ...prev,
        activeIntent: intent,
        guideProfile: nextProfile,
        guideSession: {
          ...prev.guideSession,
          profile: nextProfile,
        },
        soloTour: {
          ...prev.soloTour,
          enabled: true,
          intent,
          companionLevel: nextProfile.companionLevel ?? 'balanced',
        },
      };
    });
  }, []);

  const recommendSoloRoute = useCallback((): SoloRouteRecommendation => {
    return getSoloRouteRecommendation(stateRef.current?.guideProfile ?? initialGuideProfileRef.current);
  }, []);

  const startSoloTour = useCallback(
    (intent?: GuideIntent) => {
      const snapshot = stateRef.current;
      const patch = intent ? soloIntentToProfilePatch(intent) : {};
      const profile: UserGuideProfile = {
        ...(snapshot?.guideProfile ?? initialGuideProfileRef.current),
        ...patch,
        interests: patch.interests ?? snapshot?.guideProfile.interests ?? initialGuideProfileRef.current.interests,
        groupType: 'solo',
      };
      const recommendation = getSoloRouteRecommendation(profile);
      const activeIntent = intent ?? recommendation.route.suitableFor[0] ?? 'free_walk';

      startGuideRoute(recommendation.route, activeIntent);
      setState((prev) => ({
        ...prev,
        activeIntent,
        guideProfile: profile,
        guideSession: {
          ...prev.guideSession,
          profile,
        },
        soloTour: {
          ...prev.soloTour,
          enabled: true,
          intent: activeIntent,
          companionLevel: profile.companionLevel ?? 'balanced',
          pendingDeviation: null,
          summary: null,
        },
      }));

      trackTourEvent('tour_started', {
        route: toTourRoute(recommendation.route),
        source_page: 'solo_tour',
        preferences: { ...profile, solo: true },
        metadata: {
          solo_event: 'solo_tour_started',
          reason: recommendation.reason,
          confidence: recommendation.confidence,
          energy: recommendation.estimatedEnergy,
        },
      });

      return recommendation;
    },
    [startGuideRoute, trackTourEvent],
  );

  const handleSoloDeviation = useCallback(
    (selectedSpotId: string, action: SoloDeviationAction = 'explain_current_spot') => {
      const snapshot = stateRef.current;
      const route = snapshot?.guideSession.currentRoute ?? null;
      const deviation = detectSoloDeviation({
        route,
        completedStopIds: snapshot?.guideSession.completedStopIds ?? [],
        selectedSpotId,
      });
      if (!deviation) return null;

      if (action === 'continue_original_route') {
        setState((prev) => ({
          ...prev,
          soloTour: {
            ...prev.soloTour,
            pendingDeviation: null,
          },
        }));
        return deviation;
      }

      if (action === 'replan_from_here' && route) {
        const selectedStop = getGuideStopById(selectedSpotId);
        if (selectedStop) {
          const replanned = replanSoloRouteFromSpot({
            route,
            selectedStop,
            completedStopIds: snapshot?.guideSession.completedStopIds ?? [],
            profile: snapshot?.guideProfile ?? initialGuideProfileRef.current,
          });
          startGuideRoute(replanned, snapshot?.activeIntent ?? 'free_walk');
        }
      }

      setState((prev) => ({
        ...prev,
        soloTour: {
          ...prev.soloTour,
          enabled: true,
          deviationCount: prev.soloTour.deviationCount + 1,
          pendingDeviation: {
            ...deviation,
            suggestedAction: action,
          },
        },
      }));

      trackTourEvent('free_explore_started', {
        source_page: 'solo_deviation',
        metadata: {
          solo_event: action === 'replan_from_here' ? 'solo_replanned' : 'solo_deviation_detected',
          selected_spot_id: selectedSpotId,
          suggested_action: action,
        },
      });

      return deviation;
    },
    [startGuideRoute, trackTourEvent],
  );

  const completeSoloTour = useCallback(() => {
    const snapshot = stateRef.current;
    const summary = buildSoloTourSummary({
      route: snapshot?.guideSession.currentRoute ?? null,
      memoryEvents: snapshot?.memoryEvents ?? [],
      nextRecommendation: getSoloRouteRecommendation(snapshot?.guideProfile ?? initialGuideProfileRef.current).route,
    });
    setState((prev) => ({
      ...prev,
      status: 'completed',
      soloTour: {
        ...prev.soloTour,
        enabled: true,
        summary,
      },
    }));
    trackTourEvent('route_completed', {
      completed: true,
      source_page: 'solo_tour',
      metadata: {
        solo_event: 'solo_tour_completed',
        checkin_count: summary.checkinCount,
        narration_count: summary.listenedNarrationCount,
        question_count: summary.askedQuestionCount,
      },
    });
    return summary;
  }, [trackTourEvent]);

  /** 记录小灵抵达某个景点 */
  const arriveAtStop = useCallback(
    (spot: Spot) => {
      const arriveEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'arrive_stop',
        routeId: stateRef.current?.currentRoute?.id,
        stopId: spot.id,
        title: `抵达${spot.name}`,
        content: spot.description || '小灵已切换到现场讲解上下文。',
      });

      setState((prev) => ({
        ...prev,
        status: 'attraction',
        currentSpot: spot,
        guideSession: {
          ...prev.guideSession,
          status: 'narrating',
          currentStopId: spot.id,
        },
        memoryEvents: [...prev.memoryEvents, arriveEvent],
      }));
    },
    [],
  );

  /** 暂停导览 */
  const pauseTour = useCallback(() => {
    sendAction('pause_tour');
    trackTourEvent('tour_paused', { source_page: 'tour_control' });
    setState((prev) => ({ ...prev, status: 'paused' }));
  }, [sendAction, trackTourEvent]);

  /** 恢复导览 */
  const resumeTour = useCallback(() => {
    sendAction('resume_tour');
    trackTourEvent('tour_resumed', { source_page: 'tour_control' });
    setState((prev) => ({
      ...prev,
      status: prev.currentRoute
        ? prev.progress.completed >= prev.progress.total
          ? 'completed'
          : 'navigate'
        : 'idle',
      preferences: { ...prev.preferences, mode: 'tour' },
    }));
  }, [sendAction, trackTourEvent]);

  /** 结束导览 */
  const endTour = useCallback(() => {
    const snapshot = stateRef.current;
    const finishEvent = createGuideMemoryEvent(sessionIdRef.current, {
      type: 'finish_route',
      routeId: snapshot?.currentRoute?.id,
      stopId: snapshot?.currentSpot?.id,
      title: snapshot?.currentRoute ? `完成${snapshot.currentRoute.name}` : '结束小灵导览',
      content: snapshot?.currentRoute
        ? `已完成 ${snapshot.progress.completed}/${snapshot.progress.total} 个导览节点。`
        : '本次导览已结束。',
    });
    sendAction('end_tour');
    trackTourEvent('tour_ended', {
      source_page: 'tour_control',
      completed: snapshot?.status === 'completed' || (
        !!snapshot?.progress.total && snapshot.progress.completed >= snapshot.progress.total
      ),
      metadata: {
        completed_spots: snapshot?.progress.completed ?? 0,
        total_spots: snapshot?.progress.total ?? 0,
      },
    });
    setState((prev) => ({
      ...prev,
      status: 'idle',
      currentRoute: null,
      currentSpot: null,
      nextSpot: null,
      progress: { total: 0, completed: 0, current: 0 },
      activeIntent: null,
      guideSession: {
        ...prev.guideSession,
        status: 'completed',
        currentStopId: undefined,
        nextStopId: undefined,
      },
      memoryEvents: [...prev.memoryEvents, finishEvent],
    }));
    AsyncStorage.removeItem(TOUR_STORAGE_KEY);
  }, [sendAction, trackTourEvent]);

  /** 导航到景点 */
  const navigateToSpot = useCallback(
    (spot: Spot) => {
      sendAction('navigate_to_spot', { spot_id: spot.id });
      setState((prev) => ({
        ...prev,
        status: 'navigate',
        nextSpot: spot,
      }));
    },
    [sendAction],
  );

  /** 开始讲解 */
  const startNarration = useCallback(
    (spot: Spot) => {
      const narrationEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'narration',
        routeId: stateRef.current?.currentRoute?.id,
        stopId: spot.id,
        title: `听${spot.name}讲解`,
        content: spot.description || '小灵已开始讲解这一站。',
      });
      sendAction('start_narrate', { spot_id: spot.id });
      setState((prev) => ({
        ...prev,
        status: 'narrating',
        currentSpot: spot,
        memoryEvents: [...prev.memoryEvents, narrationEvent],
      }));
      trackTourEvent('narration_played', {
        spot,
        source_page: 'attraction',
      });
    },
    [sendAction, trackTourEvent],
  );

  /** 结束讲解 */
  const endNarration = useCallback(() => {
    sendAction('end_narrate');
  }, [sendAction]);

  /** 推荐下一个景点 */
  const suggestNextSpot = useCallback(() => {
    sendAction('suggest_next_spot');
  }, [sendAction]);

  /** 欢迎用户 */
  const greetUser = useCallback(() => {
    sendAction('greet_user');
    setState((prev) => ({ ...prev, status: 'greeting' }));
  }, [sendAction]);

  /** 推荐路线 */
  const suggestRoute = useCallback(() => {
    sendAction('suggest_route');
    setState((prev) => ({ ...prev, status: 'suggest' }));
  }, [sendAction]);

  /** 开始对话 */
  const startConversation = useCallback(() => {
    sendAction('start_conversation');
    setState((prev) => ({ ...prev, status: 'conversing' }));
  }, [sendAction]);

  /** 结束对话 */
  const endConversation = useCallback(() => {
    sendAction('end_conversation');
    setState((prev) => ({
      ...prev,
      status: state.currentRoute ? 'navigate' : 'idle',
    }));
  }, [sendAction, state.currentRoute]);

  /** 发送消息 */
  const sendMessage = useCallback(
    (text: string) => {
      const askEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'ask',
        routeId: stateRef.current?.currentRoute?.id,
        stopId: stateRef.current?.currentSpot?.id,
        title: '问小灵',
        content: text,
      });
      sendAction('ask_question', { question: text });
      setState((prev) => ({
        ...prev,
        memoryEvents: [...prev.memoryEvents, askEvent],
      }));
      trackTourEvent('question_asked', {
        source_page: 'chat',
        metadata: { question: text },
      });
    },
    [sendAction, trackTourEvent],
  );

  /** 更新偏好 */
  const updatePreferences = useCallback((prefs: Partial<TourPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }));
  }, []);

  /** 切换到自由模式 */
  const switchToFreeMode = useCallback(() => {
    updatePreferences({ mode: 'free' });
    trackTourEvent('free_explore_started', { source_page: 'home' });
    setState((prev) => ({ ...prev, status: 'free' }));
  }, [trackTourEvent, updatePreferences]);

  /** 切换到导览模式 */
  const switchToTourMode = useCallback(() => {
    updatePreferences({ mode: 'tour' });
    if (state.currentRoute) {
      trackTourEvent('tour_resumed', { source_page: 'mode_switch' });
      setState((prev) => ({
        ...prev,
        status: prev.progress.completed >= prev.progress.total ? 'completed' : 'navigate',
      }));
    } else {
      setState((prev) => ({ ...prev, status: 'suggest' }));
    }
  }, [trackTourEvent, updatePreferences, state.currentRoute]);

  // ============ GPS相关 ============

  /** 更新用户位置 */
  const updateUserLocation = useCallback((loc: UserLocation | null) => {
    setState((prev) => ({ ...prev, userLocation: loc }));
  }, []);

  /** 更新距离信息 */
  const updateDistanceInfo = useCallback((info: DistanceInfo | null) => {
    setState((prev) => ({ ...prev, distanceInfo: info }));
  }, []);

  /** 打卡景点 */
  const completeSpot = useCallback(
    async (spot: Spot, customLocation?: { latitude: number; longitude: number }) => {
      const result = await checkInSpot(
        {
          id: spot.id,
          name: spot.name,
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        customLocation,
      );

      setState((prev) => ({ ...prev, checkinResult: result }));

      if (!result.success) {
        return result;
      }

      const transition = getTourCompletionTransition(
        state.currentRoute?.spots || [],
        state.progress,
        spot,
      );
      const checkinEvent = createGuideMemoryEvent(sessionIdRef.current, {
        type: 'checkin',
        routeId: state.currentRoute?.id,
        stopId: spot.id,
        title: `${spot.name}打卡完成`,
        content: result.message || `已记录${spot.name}到访。`,
      });

      // 打卡成功 → 更新进度
      setState((prev) => {
        const nextTransition = getTourCompletionTransition(
          prev.currentRoute?.spots || [],
          prev.progress,
          spot,
        );

        return {
          ...prev,
          progress: nextTransition.progress,
          currentSpot: nextTransition.currentSpot,
          nextSpot: nextTransition.nextSpot,
          status: nextTransition.isTourComplete ? 'completed' : 'navigate',
          guideSession: {
            ...prev.guideSession,
            status: nextTransition.isTourComplete ? 'completed' : 'navigating',
            currentStopId: nextTransition.currentSpot?.id,
            nextStopId: nextTransition.nextSpot?.id,
            completedStopIds: Array.from(new Set([...prev.guideSession.completedStopIds, spot.id])),
          },
          memoryEvents: [...prev.memoryEvents, checkinEvent],
        };
      });

      // 发送打卡事件到后端
      sendAction('complete_spot', {
        spot_id: spot.id,
        distance: result.distance,
        timestamp: result.timestamp,
      });

      trackTourEvent('spot_arrived', {
        spot,
        source_page: 'attraction',
        metadata: {
          distance: result.distance,
          checkin_message: result.message,
          next_spot_id: transition.currentSpot?.id,
        },
      });

      if (transition.isTourComplete) {
        const summary = buildSoloTourSummary({
          route: stateRef.current?.guideSession.currentRoute ?? null,
          memoryEvents: [...(stateRef.current?.memoryEvents ?? []), checkinEvent],
          nextRecommendation: getSoloRouteRecommendation(
            stateRef.current?.guideProfile ?? initialGuideProfileRef.current,
          ).route,
        });
        setState((prev) => ({
          ...prev,
          soloTour: {
            ...prev.soloTour,
            enabled: prev.soloTour.enabled || prev.guideProfile.groupType === 'solo',
            summary,
          },
        }));
        trackTourEvent('route_completed', {
          spot,
          completed: true,
          source_page: 'attraction',
          metadata: {
            completed_spots: transition.progress.completed,
            total_spots: transition.progress.total,
          },
        });
      }

      return {
        ...result,
        completedSpot: spot,
        nextTargetSpot: transition.currentSpot,
        previewNextSpot: transition.nextSpot,
        isTourComplete: transition.isTourComplete,
      } as TourCheckinResult;
    },
    [sendAction, state.currentRoute, state.progress.completed, state.progress.total, trackTourEvent],
  );

  /** 设置用户位置（外部GPS Hook调用） */
  const setUserLocation = useCallback((loc: UserLocation | null) => {
    setState((prev) => ({ ...prev, userLocation: loc }));
  }, []);

  /** 设置距离信息（外部GPS Hook调用） */
  const setDistanceInfo = useCallback((info: DistanceInfo | null) => {
    setState((prev) => ({ ...prev, distanceInfo: info }));
  }, []);

  /** 清除打卡结果 */
  const clearCheckinResult = useCallback(() => {
    setState((prev) => ({ ...prev, checkinResult: null }));
  }, []);

  // ============ 打卡流程 ============

  /** 设置待处理打卡数据 */
  const setPendingCheckin = useCallback((checkin: PendingCheckin) => {
    setState((prev) => ({ ...prev, pendingCheckin: checkin }));
  }, []);

  /** 清除待处理打卡数据 */
  const clearPendingCheckin = useCallback(() => {
    setState((prev) => ({ ...prev, pendingCheckin: null }));
  }, []);

  /** 设置打卡意图（引导 explore 页自动打开相机/扫码） */
  const setCheckinIntent = useCallback((intent: CheckinIntent) => {
    setState((prev) => ({ ...prev, checkinIntent: intent }));
  }, []);

  /** 清除打卡意图 */
  const clearCheckinIntent = useCallback(() => {
    setState((prev) => ({ ...prev, checkinIntent: null }));
  }, []);

  /** 写入导览记忆事件，供记忆页和成果摘要消费 */
  const createMemoryEvent = useCallback((input: GuideMemoryEventInput) => {
    const event = createGuideMemoryEvent(sessionIdRef.current, input);
    setState((prev) => ({
      ...prev,
      memoryEvents: [...prev.memoryEvents, event],
    }));
    return event;
  }, []);

  /** 更新小灵导览画像 */
  const updateGuideProfile = useCallback((profile: Partial<UserGuideProfile>) => {
    setState((prev) => {
      const nextProfile = {
        ...prev.guideProfile,
        ...profile,
        interests: profile.interests ?? prev.guideProfile.interests,
      };
      return {
        ...prev,
        guideProfile: nextProfile,
        guideSession: {
          ...prev.guideSession,
          profile: nextProfile,
        },
      };
    });
  }, []);

  // 清理
  useEffect(() => {
    return () => disconnectRef.current?.();
  }, []);

  const actions = useMemo(() => ({
    startTour,
    startGuideRoute,
    selectSoloIntent,
    recommendSoloRoute,
    startSoloTour,
    handleSoloDeviation,
    completeSoloTour,
    pauseTour,
    resumeTour,
    endTour,
    arriveAtStop,
    navigateToSpot,
    startNarration,
    endNarration,
    suggestNextSpot,
    greetUser,
    suggestRoute,
    startConversation,
    endConversation,
    sendMessage,
    updatePreferences,
    switchToFreeMode,
    switchToTourMode,
    // GPS相关
    completeSpot,
    setUserLocation,
    setDistanceInfo,
    clearCheckinResult,
    // 打卡流程
    setPendingCheckin,
    clearPendingCheckin,
    setCheckinIntent,
    clearCheckinIntent,
    // 数字人导览契约
    createMemoryEvent,
    updateGuideProfile,
  }), [
    startTour, startGuideRoute, selectSoloIntent, recommendSoloRoute, startSoloTour,
    handleSoloDeviation, completeSoloTour, pauseTour, resumeTour, endTour, arriveAtStop, navigateToSpot,
    startNarration, endNarration, suggestNextSpot, greetUser, suggestRoute,
    startConversation, endConversation, sendMessage, updatePreferences,
    switchToFreeMode, switchToTourMode, completeSpot, setUserLocation,
    setDistanceInfo, clearCheckinResult, setPendingCheckin, clearPendingCheckin,
    setCheckinIntent, clearCheckinIntent, createMemoryEvent, updateGuideProfile,
  ]);

  return [state, actions] as const;
}
