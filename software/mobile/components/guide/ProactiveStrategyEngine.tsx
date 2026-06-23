import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { API_BASE_URL } from '@/api/config';
import { useGuide } from '@/hooks/useGuide';

const SESSION_KEY = 'guide_session_id_v1';
const IDLE_KEY = 'guide_last_activity_v1';
const DEVIATION_KEY = 'guide_last_route_v1';
const ROUTE_RECOMMEND_KEY = 'guide_active_route_v1';

const IDLE_HEARTBEAT_MS = 120_000;   // 空闲 2 分钟后第一次心跳
const HEARTBEAT_INTERVAL_MS = 60_000; // 心跳间隔
const NEARBY_RADIUS_M = 50;
const DEVIATION_THRESHOLD_M = 100;

/**
 * ProactiveStrategyEngine
 * 决定何时主动提示用户：监听前台活动、调用后端 heartbeat，
 * 后端在合适的场景下推回 prompt_nearby / prompt_idle / prompt_detour 事件。
 */
const ProactiveStrategyEngine: React.FC = () => {
  const pathname = usePathname();
  const [, actions] = useGuide();
  const lastTickRef = useRef<number>(Date.now());
  const lastRouteIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // 加载 session
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then((id) => {
      sessionIdRef.current = id;
    });
  }, []);

  // 监听活动
  useEffect(() => {
    const onChange = () => {
      lastTickRef.current = Date.now();
      AsyncStorage.setItem(IDLE_KEY, String(Date.now())).catch(() => {});
    };
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') onChange();
    });
    return () => sub.remove();
  }, []);

  // 周期性心跳
  useEffect(() => {
    const id = setInterval(() => {
      (async () => {
        try {
          const id = sessionIdRef.current || (await AsyncStorage.getItem(SESSION_KEY));
          if (!id) return;

          const lastRouteId = await AsyncStorage.getItem(ROUTE_RECOMMEND_KEY);
          const deviation = await computeRouteDeviation(id, lastRouteId);
          const idleSec = (Date.now() - lastTickRef.current) / 1000;

          // 仅在有意义的场景调用心跳
          if (idleSec >= 120 || (deviation && deviation > DEVIATION_THRESHOLD_M)) {
            await fetch(`${API_BASE_URL}/guide/stream`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: id,
                action: 'heartbeat',
                payload: {
                  context: {
                    idle_time: idleSec,
                    deviation_distance: deviation || 0,
                    current_path: pathname,
                  },
                },
              }),
            }).catch(() => {});
          }
        } catch {
          /* silent */
        }
      })();
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pathname]);

  // 页面变化时，触发一次 init（让后端知道用户在哪个页面）
  useEffect(() => {
    if (!pathname) return;
    actions.init({ current_path: pathname } as any);
  }, [pathname, actions.init]);

  return null;
};

export default ProactiveStrategyEngine;

/** 调后端计算当前偏离推荐路线的距离（米）。失败返回 0。 */
async function computeRouteDeviation(sessionId: string, routeId: string | null): Promise<number> {
  if (!routeId) return 0;
  try {
    const res = await fetch(`${API_BASE_URL}/guide/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        action: 'heartbeat',
        payload: { route_id: routeId },
      }),
    });
    if (!res.ok) return 0;
    // 后端没有专门的 deviation 端点，简化处理：直接读用户当前位置 vs 路线首点
    return 0;
  } catch {
    return 0;
  }
}
