import type { TravelMemory } from '@/api/memory';
import type { GuideMemoryEvent } from '@/types/guide';

export interface MemoryGraphCandidate {
  eventId: string;
  eventType: GuideMemoryEvent['type'];
  title: string;
  content: string;
  spotId?: string;
  routeId?: string;
  sourceType: string;
  sourcePage: string;
  createdAt: string;
}

const EVENT_SOURCE_TYPES: Partial<Record<GuideMemoryEvent['type'], string>> = {
  arrive_stop: 'guide',
  narration: 'narration',
  ask: 'chat',
  checkin: 'checkin',
  finish_route: 'route',
};

function getSavedEventIds(memories: TravelMemory[]) {
  return new Set(
    memories
      .map((memory) => memory.metadata_json?.source_event_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
}

function toCandidate(event: GuideMemoryEvent): MemoryGraphCandidate | null {
  const sourceType = EVENT_SOURCE_TYPES[event.type];
  const content = event.content?.trim();
  if (!sourceType || !content) return null;

  return {
    eventId: event.id,
    eventType: event.type,
    title: event.title,
    content,
    spotId: event.stopId,
    routeId: event.routeId,
    sourceType,
    sourcePage: typeof event.metadata?.source_page === 'string'
      ? event.metadata.source_page
      : sourceType,
    createdAt: event.createdAt,
  };
}

export function buildMemoryGraphCandidates(
  events: GuideMemoryEvent[],
  memories: TravelMemory[],
  limit = 6,
): MemoryGraphCandidate[] {
  const savedEventIds = getSavedEventIds(memories);

  return events
    .map(toCandidate)
    .filter((candidate): candidate is MemoryGraphCandidate => (
      !!candidate && !savedEventIds.has(candidate.eventId)
    ))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
