import {
  createMobileAnalyticsEvent,
  normalizeAnalyticsFields,
  summarizeAnalyticsQueue,
  trimAnalyticsQueue,
} from '../utils/mobileAnalytics';

describe('mobileAnalytics', () => {
  test('normalizes undefined fields and long text', () => {
    const fields = normalizeAnalyticsFields({
      text: '灵'.repeat(520),
      route_id: undefined,
      source_page: 'chat',
    });

    expect(fields.route_id).toBeUndefined();
    expect(String(fields.text).length).toBeLessThanOrEqual(503);
    expect(fields.source_page).toBe('chat');
  });

  test('creates event with session and timestamp', () => {
    const event = createMobileAnalyticsEvent(
      'question_asked',
      'session-1',
      { source_page: 'chat' },
      '2026-06-23T00:00:00.000Z',
    );

    expect(event.id).toContain('question_asked');
    expect(event.session_id).toBe('session-1');
    expect(event.fields.source_page).toBe('chat');
  });

  test('trims queue and summarizes event counts', () => {
    const events = [
      createMobileAnalyticsEvent('tour_started', 's'),
      createMobileAnalyticsEvent('spot_arrived', 's'),
      createMobileAnalyticsEvent('spot_arrived', 's'),
    ];

    expect(trimAnalyticsQueue(events, 2)).toHaveLength(2);
    expect(summarizeAnalyticsQueue(events).tour_started).toBe(1);
    expect(summarizeAnalyticsQueue(events).spot_arrived).toBe(2);
  });
});
