import fs from 'fs';
import path from 'path';

describe('digital human driver speech loop guard', () => {
  test('subscribes to manager speak events only to start the local timeline', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
      'utf8',
    );

    expect(source).not.toContain('speakRef.current(text');
    expect(source).toMatch(/VRMManager\.on\('speak', handleManagerSpeak\)/);
    expect(source).toMatch(/const handleManagerSpeak = \(\{[\s\S]*?startTimeline\(text, duration, managerAction, actionDuration\);[\s\S]*?\};/s);
    expect(source).toMatch(/const speak = useCallback\([\s\S]*?triggerSpeak\(/s);
    expect(source).not.toMatch(/const speak = useCallback\([\s\S]*?startTimeline\(text, durationMs, options\?\.action, options\?\.actionDurationMs\);[\s\S]*?triggerSpeak\(/s);
  });
});
