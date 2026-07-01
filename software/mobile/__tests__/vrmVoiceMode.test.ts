import fs from 'fs';
import path from 'path';

describe('VRM voice mode routing', () => {
  test('routes browser voice mode to browser speech synthesis instead of silent fallback', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );
    const handleSpeakBody = source.match(/const handleSpeak = \([\s\S]*?VRMManager\.on\('speak'/)?.[0] || '';

    expect(handleSpeakBody).toContain("mode === 'browser'");
    expect(handleSpeakBody).toMatch(/mode === 'browser'[\s\S]*playWithBrowserTTS\(text, emotion\)/);
    expect(handleSpeakBody).toMatch(/mode === 'silent'[\s\S]*triggerSpeakFallback\(text, emotion\)/);
  });
});
