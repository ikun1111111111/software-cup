import {
  createFreeRoamGuideRuntime,
  createInitialGuideRuntime,
  createStartedGuideRuntime,
  setGuideRuntimeMode,
} from '../utils/guideRuntime';

const route = {
  id: 'route-a',
  name: 'Xiaoling Route',
  spots: [
    { id: 'spot-a', name: 'Spot A' },
    { id: 'spot-b', name: 'Spot B' },
  ],
};

describe('guide runtime', () => {
  test('starts proactive guide as active navigation', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'proactive',
      sourcePage: 'routes',
    });

    expect(runtime.mode).toBe('proactive');
    expect(runtime.companionLevel).toBe('active');
    expect(runtime.status).toBe('navigating');
    expect(runtime.currentRoute).toBe(route);
    expect(runtime.currentSpot).toEqual(route.spots[0]);
    expect(runtime.nextSpot).toEqual(route.spots[1]);
  });

  test('starts quiet companion as free roam without losing route context', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'companion',
      companionLevel: 'quiet',
      sourcePage: 'home',
    });

    expect(runtime.mode).toBe('companion');
    expect(runtime.companionLevel).toBe('quiet');
    expect(runtime.status).toBe('free_roam');
    expect(runtime.currentRoute).toBe(route);
    expect(runtime.currentSpot).toEqual(route.spots[0]);
  });

  test('switches intensity while preserving current route and spot', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'proactive',
      sourcePage: 'routes',
    });

    const quiet = setGuideRuntimeMode(runtime, 'companion', 'quiet');

    expect(quiet.mode).toBe('companion');
    expect(quiet.companionLevel).toBe('quiet');
    expect(quiet.status).toBe('free_roam');
    expect(quiet.currentRoute).toBe(route);
    expect(quiet.currentSpot).toEqual(route.spots[0]);
  });

  test('creates idle runtime with balanced companion defaults', () => {
    const runtime = createInitialGuideRuntime();

    expect(runtime.mode).toBe('companion');
    expect(runtime.companionLevel).toBe('balanced');
    expect(runtime.status).toBe('idle');
  });

  test('starts free roam companion without forcing a route', () => {
    const runtime = createFreeRoamGuideRuntime({
      companionLevel: 'quiet',
      activeIntent: 'free_walk',
      sourcePage: 'explore',
    });

    expect(runtime.mode).toBe('companion');
    expect(runtime.companionLevel).toBe('quiet');
    expect(runtime.status).toBe('free_roam');
    expect(runtime.activeIntent).toBe('free_walk');
    expect(runtime.currentRoute).toBeNull();
    expect(runtime.currentSpot).toBeNull();
    expect(runtime.nextSpot).toBeNull();
  });
});
