export type MobileAnalyticsEventName =
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
  | 'memory_created'
  | 'feedback_submitted';

export interface MobileAnalyticsEvent {
  id: string;
  name: MobileAnalyticsEventName;
  session_id: string;
  timestamp: string;
  fields: Record<string, unknown>;
}

const MAX_TEXT_FIELD_LENGTH = 500;

function createEventId(name: MobileAnalyticsEventName, timestamp: string) {
  return `${name}-${Date.parse(timestamp)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFieldValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_FIELD_LENGTH
      ? `${value.slice(0, MAX_TEXT_FIELD_LENGTH)}...`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeFieldValue);
  }
  if (value && typeof value === 'object') {
    return normalizeAnalyticsFields(value as Record<string, unknown>);
  }
  return value;
}

export function normalizeAnalyticsFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, normalizeFieldValue(value)]),
  );
}

export function createMobileAnalyticsEvent(
  name: MobileAnalyticsEventName,
  sessionId: string,
  fields: Record<string, unknown> = {},
  timestamp = new Date().toISOString(),
): MobileAnalyticsEvent {
  return {
    id: createEventId(name, timestamp),
    name,
    session_id: sessionId,
    timestamp,
    fields: normalizeAnalyticsFields(fields),
  };
}

export function trimAnalyticsQueue(
  events: MobileAnalyticsEvent[],
  maxSize = 200,
): MobileAnalyticsEvent[] {
  return events.slice(Math.max(events.length - maxSize, 0));
}

export function summarizeAnalyticsQueue(events: MobileAnalyticsEvent[]): Record<MobileAnalyticsEventName, number> {
  const summary = {
    app_opened: 0,
    tour_started: 0,
    tour_paused: 0,
    tour_resumed: 0,
    tour_ended: 0,
    free_explore_started: 0,
    spot_arrived: 0,
    narration_played: 0,
    question_asked: 0,
    route_completed: 0,
    memory_created: 0,
    feedback_submitted: 0,
  };

  for (const event of events) {
    summary[event.name] += 1;
  }

  return summary;
}
