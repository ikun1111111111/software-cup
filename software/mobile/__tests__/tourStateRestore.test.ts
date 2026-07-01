import { restoreIdleTourState } from '../utils/tourStateRestore';

const route = {
  id: 'history-route',
  name: '历史文化深度线',
  spots: [
    { id: 'spot-a', name: '九龙灌浴' },
    { id: 'spot-b', name: '五智门' },
  ],
};

describe('tour state restore', () => {
  test('does not restore an active route onto the home screen after cold start', () => {
    const restored = restoreIdleTourState({
      status: 'navigate',
      currentRoute: route,
      currentSpot: route.spots[0],
      nextSpot: route.spots[1],
      progress: { total: 2, completed: 0, current: 1 },
      activeIntent: 'history',
      guideRuntime: {
        mode: 'proactive',
        companionLevel: 'active',
        status: 'navigating',
        activeIntent: 'history',
        currentRoute: route,
        currentSpot: route.spots[0],
        nextSpot: route.spots[1],
        sourcePage: 'home',
        prompt: null,
        narration: null,
      },
      preferences: {
        mode: 'tour',
        autoNarrate: true,
        narrationSpeed: 'normal',
        dndMode: false,
      },
      guideSession: {
        sessionId: 'session-a',
        status: 'navigating',
        currentRoute: {
          id: 'guide-route',
          name: '历史文化深度线',
          theme: 'history',
          durationMinutes: 120,
          description: 'demo',
          suitableFor: ['history'],
          openingLine: 'demo',
          stops: [],
        },
        currentStopId: 'spot-a',
        nextStopId: 'spot-b',
        completedStopIds: ['spot-a'],
        profile: {
          interests: ['history'],
          pace: 'normal',
          groupType: 'solo',
          budgetLevel: 'medium',
          narrationDepth: 'standard',
          autoNarrate: true,
          companionLevel: 'active',
        },
      },
    });

    expect(restored.status).toBe('idle');
    expect(restored.currentRoute).toBeNull();
    expect(restored.currentSpot).toBeNull();
    expect(restored.nextSpot).toBeNull();
    expect(restored.progress).toEqual({ total: 0, completed: 0, current: 0 });
    expect(restored.preferences?.mode).toBe('free');
    expect(restored.activeIntent).toBeNull();
    expect(restored.guideRuntime?.status).toBe('idle');
    expect(restored.guideRuntime?.currentRoute).toBeNull();
    expect(restored.guideSession?.status).toBe('idle');
    expect(restored.guideSession?.currentRoute).toBeUndefined();
    expect(restored.guideSession?.currentStopId).toBeUndefined();
    expect(restored.guideSession?.nextStopId).toBeUndefined();
  });
});
