import fs from 'fs';
import path from 'path';

describe('map press responsiveness guard', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/map.tsx'),
    'utf8',
  );

  test('defers map button side effects until after the first visible update', () => {
    expect(source).toContain("from '@/utils/scheduling';");
    expect(source).toContain('runAfterNextPaint');
    expect(source).toContain('scheduleMapSideEffect');
  });

  test('interrupts stale guide speech before speaking map action feedback', () => {
    expect(source).toMatch(
      /const speakMapFeedback = useCallback\([\s\S]*?VRMManager\.stopSpeaking\(\{ playQueued: false \}\);[\s\S]*?VRMManager\.speak/s,
    );
    expect(source).toContain('speakMapFeedback(');
    expect(source).not.toMatch(/runAfterVisibleUpdate\(\(\) => \{\s*VRMManager\.speak/s);
  });
});
