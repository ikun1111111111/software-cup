import { post } from './request';
import { trackMobileEvent } from '@/services/mobileAnalytics';

export type MobileTourEventName =
  | 'app_opened'
  | 'tour_started'
  | 'tour_paused'
  | 'tour_resumed'
  | 'tour_ended'
  | 'free_explore_started'
  | 'spot_arrived'
  | 'narration_played'
  | 'question_asked'
  | 'route_completed'
  | 'memory_created';

export interface MobileTourEventPayload {
  session_id: string;
  event_name: MobileTourEventName;
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
}

export async function recordMobileTourEvent(payload: MobileTourEventPayload) {
  try {
    const resp = await post<{ id: number; status: string }>('/analytics/mobile-events', payload, {
      retries: 0,
      timeout: 3000,
    });
    return resp.data;
  } catch (error) {
    await trackMobileEvent(payload.event_name, {
      route_id: payload.route_id,
      route_name: payload.route_name,
      spot_id: payload.spot_id,
      spot_name: payload.spot_name,
      source_page: payload.source_page,
      duration_ms: payload.duration_ms,
      latency_ms: payload.latency_ms,
      completed: payload.completed,
      preferences: payload.preferences,
      metadata: payload.metadata,
    }, payload.session_id);
    throw error;
  }
}
