import {
  DEFAULT_USER_GUIDE_PROFILE,
  LINGSHAN_GUIDE_ROUTES,
  getDefaultGuideRoute,
  getSoloRouteRecommendation,
} from '../data/lingshanGuideData';
import {
  buildSoloCompanionPrompt,
  buildSoloTourSummary,
  detectSoloDeviation,
  replanSoloRouteFromSpot,
} from '../utils/soloTour';
import type { GuideMemoryEvent, GuideRoute } from '../types/guide';

describe('soloTour recommendation', () => {
  test('uses a solo-first default guide profile', () => {
    expect(DEFAULT_USER_GUIDE_PROFILE.groupType).toBe('solo');
    expect(DEFAULT_USER_GUIDE_PROFILE.companionLevel).toBe('balanced');
    expect(DEFAULT_USER_GUIDE_PROFILE.safetyReminder).toBe(true);
    expect(DEFAULT_USER_GUIDE_PROFILE.interests).toContain('free_walk');
  });

  test('recommends the quiet nature route for free walk solo intent', () => {
    const recommendation = getSoloRouteRecommendation({
      ...DEFAULT_USER_GUIDE_PROFILE,
      interests: ['free_walk', 'quiet'],
      companionLevel: 'quiet',
    });

    expect(recommendation.route.id).toBe('lingshan-nature-five-hours');
    expect(recommendation.reason).toContain('少打扰');
    expect(recommendation.companionLine).toContain('安静');
  });

  test('recommends the culture route when the user wants deep explanation', () => {
    const recommendation = getSoloRouteRecommendation({
      ...DEFAULT_USER_GUIDE_PROFILE,
      interests: ['history', 'deep_explain'],
      narrationDepth: 'deep',
      companionLevel: 'active',
    });

    expect(recommendation.route.id).toBe('lingshan-history-six-hours');
    expect(recommendation.reason).toContain('文化');
    expect(recommendation.estimatedEnergy).toBe('high');
  });

  test('falls back to an existing guide route for unknown solo preferences', () => {
    const route = getDefaultGuideRoute('free_walk');

    expect(LINGSHAN_GUIDE_ROUTES.map((item) => item.id)).toContain(route.id);
  });

  test('builds quiet companion prompts without voice interruption', () => {
    const prompt = buildSoloCompanionPrompt({
      level: 'near',
      spotName: '梵宫',
      distance: 80,
      companionLevel: 'quiet',
    });

    expect(prompt.text).toContain('梵宫');
    expect(prompt.delivery).toBe('subtitle');
    expect(prompt.emotion).toBe('neutral');
  });

  test('detects when a solo tourist chooses a spot outside the current route', () => {
    const route = LINGSHAN_GUIDE_ROUTES[0];
    const deviation = detectSoloDeviation({
      route,
      completedStopIds: [route.stops[0].id],
      selectedSpotId: 'free-roam-spot',
    });

    expect(deviation?.suggestedAction).toBe('explain_current_spot');
    expect(deviation?.currentSpotId).toBe('free-roam-spot');
  });

  test('replans a solo route from the selected spot while preserving remaining stops', () => {
    const route = LINGSHAN_GUIDE_ROUTES[0];
    const selectedStop = LINGSHAN_GUIDE_ROUTES[1].stops[0];
    const replanned = replanSoloRouteFromSpot({
      route,
      selectedStop,
      completedStopIds: [route.stops[0].id],
      profile: DEFAULT_USER_GUIDE_PROFILE,
    });

    expect(replanned.id).toContain('solo-replan');
    expect(replanned.stops[0].id).toBe(selectedStop.id);
    expect(replanned.stops.some((stop) => stop.id === route.stops[0].id)).toBe(false);
    expect(replanned.stops.length).toBeLessThanOrEqual(4);
  });

  test('summarizes solo tour memory events for the memory page', () => {
    const route = {
      id: 'solo-route',
      name: '独游精选线',
      theme: 'nature',
      durationMinutes: 120,
      description: 'test',
      suitableFor: ['free_walk'],
      openingLine: 'start',
      stops: [],
    } satisfies GuideRoute;
    const events: GuideMemoryEvent[] = [
      {
        id: '1',
        sessionId: 's',
        type: 'start_route',
        routeId: route.id,
        title: '开始独游',
        createdAt: '2026-06-23T00:00:00.000Z',
      },
      {
        id: '2',
        sessionId: 's',
        type: 'narration',
        routeId: route.id,
        stopId: 'fan-gong',
        title: '听梵宫讲解',
        createdAt: '2026-06-23T00:01:00.000Z',
      },
      {
        id: '3',
        sessionId: 's',
        type: 'ask',
        routeId: route.id,
        title: '问小灵',
        createdAt: '2026-06-23T00:02:00.000Z',
      },
      {
        id: '4',
        sessionId: 's',
        type: 'checkin',
        routeId: route.id,
        stopId: 'fan-gong',
        title: '梵宫打卡完成',
        createdAt: '2026-06-23T00:03:00.000Z',
      },
    ];

    const summary = buildSoloTourSummary({
      route,
      memoryEvents: events,
      nextRecommendation: LINGSHAN_GUIDE_ROUTES[1],
    });

    expect(summary.routeName).toBe('独游精选线');
    expect(summary.listenedNarrationCount).toBe(1);
    expect(summary.askedQuestionCount).toBe(1);
    expect(summary.checkinCount).toBe(1);
    expect(summary.nextRecommendation?.id).toBe(LINGSHAN_GUIDE_ROUTES[1].id);
  });
});
