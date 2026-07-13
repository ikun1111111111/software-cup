import fs from 'fs';
import path from 'path';

describe('digital human driver speech loop guard', () => {
  test('waits for audible playback sync before starting the local timeline', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
      'utf8',
    );

    expect(source).not.toContain('speakRef.current(text');
    expect(source).toMatch(/VRMManager\.on\('speak', handleManagerSpeak\)/);
    const speakHandler = source.match(/const handleManagerSpeak = \(\{[\s\S]*?\n    \};/)?.[0] || '';
    const resyncHandler = source.match(/const handleResync = \(\{[\s\S]*?\n    \};/)?.[0] || '';

    expect(speakHandler).not.toContain('startTimeline(');
    expect(speakHandler).toContain('currentSpeakTextRef.current = text');
    expect(resyncHandler).toContain('startTimeline(');
    expect(resyncHandler).toContain('targetId !== speakerIdRef.current');
    expect(source).toMatch(/const speak = useCallback\([\s\S]*?triggerSpeak\(/s);
    expect(source).not.toMatch(/const speak = useCallback\([\s\S]*?startTimeline\(text, durationMs, options\?\.action, options\?\.actionDurationMs\);[\s\S]*?triggerSpeak\(/s);
  });

  test('does not force-restart an action that is already playing', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
      'utf8',
    );

    const restartBody = source.match(/const restartAction = useCallback\([\s\S]*?\n  \}, \[clearActionRestartTimer\]\);/)?.[0] || '';

    expect(restartBody).toContain('if (nextAction === currentActionRef.current)');
    expect(source).toContain('currentActionRef.current = nextAction');
    expect(restartBody.indexOf('if (nextAction === currentActionRef.current)'))
      .toBeLessThan(restartBody.indexOf('clearActionRestartTimer();'));
    expect(restartBody).toContain('setActionDurationMs(currentActionDurationRef.current)');
  });
});
