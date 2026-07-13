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

  test('keeps the web chat page on backend TTS by default', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
      'utf8',
    );

    expect(source).toContain('const DEFAULT_CHAT_VOICE_MODE: VoiceMode = DEFAULT_DIGITAL_HUMAN_VOICE_MODE;');
    expect(source).toContain("const VOICE_MODE_KEY = '@vrm_voice_mode_v2';");
    expect(source).not.toContain("Platform.OS === 'web' ? 'browser' : 'tts'");
  });
});
