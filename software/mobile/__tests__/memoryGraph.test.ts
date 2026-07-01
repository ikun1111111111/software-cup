import { buildMemoryGraphCandidates } from '../utils/memoryGraph';
import type { TravelMemory } from '../api/memory';
import type { GuideMemoryEvent } from '../types/guide';

describe('memory graph candidates', () => {
  const baseEvent = {
    sessionId: 'session-1',
    createdAt: '2026-06-23T10:00:00.000Z',
  };

  test('turns guide and chat events into newest-first memory candidates', () => {
    const events: GuideMemoryEvent[] = [
      {
        ...baseEvent,
        id: 'narration-1',
        type: 'narration',
        routeId: 'route-1',
        stopId: 'spot-1',
        title: '听九龙灌浴讲解',
        content: '听到九龙灌浴的故事，知道了浴佛仪式的由来。',
        createdAt: '2026-06-23T10:00:00.000Z',
      },
      {
        ...baseEvent,
        id: 'ask-1',
        type: 'ask',
        routeId: 'route-1',
        stopId: 'spot-1',
        title: '问小灵：九龙灌浴什么时候表演',
        content: '问：九龙灌浴什么时候表演？\n答：通常每天有多场演出，建议入园后查看当日公告。',
        createdAt: '2026-06-23T10:05:00.000Z',
        metadata: {
          source_page: 'chat',
          route_name: '九龙灌浴线',
          spot_name: '九龙灌浴',
          answer_source: 'offline_fallback',
        },
      },
      {
        ...baseEvent,
        id: 'start-1',
        type: 'start_route',
        routeId: 'route-1',
        title: '开始路线',
        createdAt: '2026-06-23T09:50:00.000Z',
      },
    ];

    const candidates = buildMemoryGraphCandidates(events, []);

    expect(candidates.map((item) => item.eventId)).toEqual(['ask-1', 'narration-1']);
    expect(candidates[0]).toMatchObject({
      eventType: 'ask',
      sourceType: 'chat',
      sourcePage: 'chat',
      spotId: 'spot-1',
      spotName: '九龙灌浴',
      routeId: 'route-1',
      routeName: '九龙灌浴线',
      metadata: expect.objectContaining({
        answer_source: 'offline_fallback',
      }),
    });
  });

  test('hides events already saved as memories', () => {
    const events: GuideMemoryEvent[] = [
      {
        ...baseEvent,
        id: 'checkin-1',
        type: 'checkin',
        stopId: 'spot-2',
        title: '梵宫打卡',
        content: '在梵宫留下了一次打卡。',
      },
    ];
    const memories = [
      {
        id: 1,
        metadata_json: { source_event_id: 'checkin-1' },
      },
    ] as unknown as TravelMemory[];

    expect(buildMemoryGraphCandidates(events, memories)).toEqual([]);
  });
});
