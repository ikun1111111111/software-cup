/** 数字人智能向导 API 封装（React Native） */
import { API_BASE_URL } from './config';

export type GuideContext = {
  latitude?: number;
  longitude?: number;
  idle_time?: number;
  deviation_distance?: number;
  deviation_duration?: number;
  current_spot_id?: string;
};

export type GuideAction =
  | 'init'
  | 'dismiss_prompt'
  | 'accept_prompt'
  | 'start_narrate'
  | 'end_narrate'
  | 'ask_question'
  | 'set_preferences'
  | 'heartbeat';

export interface GuideStreamRequest {
  session_id: string;
  action: GuideAction;
  payload?: Record<string, any>;
}

export interface GuideEvent {
  event: string;
  data: any;
}

export interface UserGuidePreferences {
  enable_nearby_prompt: boolean;
  enable_idle_prompt: boolean;
  enable_detour_prompt: boolean;
  prompt_frequency: 'low' | 'medium' | 'high';
  auto_narrate: boolean;
  narration_speed: 'slow' | 'normal' | 'fast';
  dnd_mode: boolean;
  dnd_schedule?: { start: string; end: string };
  preferred_role: string;
  preferred_route_type: string;
}

export interface GuideState {
  status: 'idle' | 'prompting' | 'narrating' | 'chatting' | 'free';
  current_spot: any | null;
  current_route: any | null;
  preferences: UserGuidePreferences;
}

const PREFIX = `${API_BASE_URL}/guide`;

/** 通过 fetch + ReadableStream 建立 SSE 流。返回 abort 函数。 */
export function connectGuideStream(
  request: GuideStreamRequest,
  onEvent: (event: GuideEvent) => void,
  onError?: (error: Error) => void,
): { disconnect: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${PREFIX}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reader = (response.body as any)?.getReader?.();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            let data: any = raw;
            try {
              data = JSON.parse(raw);
            } catch {
              /* keep raw */
            }
            onEvent({ event: currentEvent || 'message', data });
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        onError?.(err);
      }
    }
  })();

  return {
    disconnect: () => controller.abort(),
  };
}

/** 获取当前向导状态 */
export async function getGuideState(sessionId: string): Promise<GuideState> {
  const res = await fetch(`${PREFIX}/state?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`获取向导状态失败: ${res.status}`);
  return res.json();
}

/** 获取用户偏好 */
export async function getPreferences(sessionId: string): Promise<UserGuidePreferences> {
  const res = await fetch(`${PREFIX}/preferences?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`获取偏好失败: ${res.status}`);
  return res.json();
}

/** 更新用户偏好 */
export async function updatePreferences(
  sessionId: string,
  updates: Partial<UserGuidePreferences>,
): Promise<UserGuidePreferences> {
  const res = await fetch(`${PREFIX}/preferences?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`更新偏好失败: ${res.status}`);
  return res.json();
}
