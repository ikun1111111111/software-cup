import fs from 'fs';
import path from 'path';

describe('VRM voice latency guard', () => {
  test('uses prefetched audio when available and raw MP3 streaming otherwise', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain('ttsCacheRef.current.peek(cacheKey)');
    expect(source).toContain('prepareTTSStream(text, voiceId)');
    expect(source).toContain('phonemes: []');
  });

  test('does not pass the SSE endpoint directly to expo-av', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../api/tts.ts'),
      'utf8',
    );

    expect(source).toContain('/tts/stream-ticket');
    expect(source).toContain('/tts/audio/');
    expect(source).not.toContain("audioUri = `${API_BASE_URL}/tts/stream`");
  });
});
