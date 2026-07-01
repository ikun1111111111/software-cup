import fs from 'fs';
import path from 'path';

describe('mobile voice pipeline guards', () => {
  test('lets React Native attach the multipart boundary for ASR uploads', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVoiceInput.ts'),
      'utf8',
    );
    const transcribeRequest = source.match(/fetch\(`\$\{API_BASE_URL\}\/asr\/transcribe`[\s\S]*?\n      \}\);/)?.[0] || '';

    expect(transcribeRequest).toContain('body: formData');
    expect(transcribeRequest).not.toContain("'Content-Type': 'multipart/form-data'");
    expect(transcribeRequest).not.toContain('"Content-Type": "multipart/form-data"');
  });

  test('surfaces backend ASR errors instead of treating them as empty transcripts', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVoiceInput.ts'),
      'utf8',
    );

    expect(source).toContain('if (data.error)');
    expect(source).toContain('throw new Error(data.error)');
  });

  test('declares microphone usage for Expo native builds', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8'),
    );

    expect(appJson.expo.plugins).toEqual(
      expect.arrayContaining([
        [
          'expo-av',
          expect.objectContaining({
            microphonePermission: expect.any(String),
          }),
        ],
      ]),
    );
  });

  test('uses expo-av Audio namespace for memory voice recording', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/memory/MomentModal.tsx'),
      'utf8',
    );

    expect(source).toContain("import { Audio } from 'expo-av';");
    expect(source).not.toContain("import * as Audio from 'expo-av';");
    expect(source).not.toContain('(Audio as any)');
  });

  test('uses the cache TTS client instead of treating SSE stream responses as audio files', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useTTS.ts'),
      'utf8',
    );

    expect(source).toContain("import { fetchTTS } from '@/api/tts';");
    expect(source).toContain('const result = await fetchTTS(options.text, options.voice);');
    expect(source).not.toContain('/tts/stream');
    expect(source).not.toContain('response.blob()');
  });
});
