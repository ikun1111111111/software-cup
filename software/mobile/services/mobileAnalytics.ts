import AsyncStorage from '@react-native-async-storage/async-storage';
import { post } from '@/api/request';
import {
  createMobileAnalyticsEvent,
  trimAnalyticsQueue,
  type MobileAnalyticsEvent,
  type MobileAnalyticsEventName,
} from '@/utils/mobileAnalytics';

const ANALYTICS_QUEUE_KEY = 'mobile_analytics_queue_v1';
const DEFAULT_SESSION_ID = 'mobile-app-session';

async function readQueue(): Promise<MobileAnalyticsEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: MobileAnalyticsEvent[]) {
  await AsyncStorage.setItem(
    ANALYTICS_QUEUE_KEY,
    JSON.stringify(trimAnalyticsQueue(events)),
  );
}

export async function trackMobileEvent(
  name: MobileAnalyticsEventName,
  fields: Record<string, unknown> = {},
  sessionId = DEFAULT_SESSION_ID,
): Promise<MobileAnalyticsEvent> {
  const event = createMobileAnalyticsEvent(name, sessionId, fields);
  const queue = await readQueue();
  await writeQueue([...queue, event]);
  return event;
}

export async function getQueuedMobileEvents(): Promise<MobileAnalyticsEvent[]> {
  return readQueue();
}

export async function clearQueuedMobileEvents(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
}

export async function flushMobileEvents(): Promise<{ flushed: number; pending: number }> {
  const events = await readQueue();
  if (events.length === 0) {
    return { flushed: 0, pending: 0 };
  }

  const failed: MobileAnalyticsEvent[] = [];
  try {
    for (const event of events) {
      try {
        await post('/analytics/mobile-events', {
          session_id: event.session_id,
          event_name: event.name,
          route_id: event.fields.route_id,
          route_name: event.fields.route_name,
          spot_id: event.fields.spot_id,
          spot_name: event.fields.spot_name,
          source_page: event.fields.source_page,
          duration_ms: event.fields.duration_ms,
          latency_ms: event.fields.latency_ms,
          completed: Boolean(event.fields.completed),
          preferences: event.fields.preferences,
          metadata: {
            ...event.fields,
            client_event_id: event.id,
            client_timestamp: event.timestamp,
          },
        }, { retries: 0, timeout: 3000 });
      } catch {
        failed.push(event);
      }
    }

    await writeQueue(failed);
    return { flushed: events.length - failed.length, pending: failed.length };
  } catch {
    return { flushed: 0, pending: events.length };
  }
}
