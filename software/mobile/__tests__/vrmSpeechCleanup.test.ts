import fs from 'fs';
import path from 'path';

describe('VRM speech cleanup', () => {
  test('cancels active audio and global speech state on hook unmount', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );
    const lines = source.split(/\r?\n/).map((line) => line.trim());

    expect(source).toContain('disposeActiveSpeech({ resetRun: true });');
    expect(lines).toContain('sound.stopAsync().catch(() => {});');
    expect(lines).toContain('sound.unloadAsync().catch(() => {});');
    expect(lines).toContain('window.speechSynthesis.cancel();');
    expect(source).toContain('await Audio.setAudioModeAsync({');
    expect(source).toContain('playsInSilentModeIOS: true,');
    expect(lines).toContain('await sound.playAsync();');
    expect(lines).toContain('VRMManager.stopSpeaking({ playQueued: false });');
  });

  test('uses a browser speech fallback timer when speech synthesis does not finish', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain("import { estimateSpeechDuration } from '../utils/digitalHumanDriver';");
    expect(source).toMatch(/const playWithBrowserTTS = useCallback\(async[\s\S]*?const estimatedDuration = estimateSpeechDuration\(text\);/s);
    expect(source).toContain('scheduleVisualStop(Math.max(estimatedDuration * 2, estimatedDuration + 5000), runId);');
    expect(source).toContain('window.speechSynthesis.speak(utterance);');
  });

  test('keeps timed subtitle progression alive while accepting browser speech boundaries', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );
    const boundarySyncBody = source.match(/const syncSubtitleToSpeechBoundary = useCallback\([\s\S]*?\n  \}, \[\]\);/)?.[0] || '';

    expect(source).toContain('utterance.onboundary = (event) => {');
    expect(source).toContain('scheduleSubtitleBoundarySync(event.charIndex);');
    expect(source).toContain('const subtitleCueIndexRef = useRef(0);');
    expect(boundarySyncBody).toContain('subtitleCueIndexRef.current = cueIndex;');
    expect(boundarySyncBody).not.toContain('clearSubtitleTimer();');
    expect(source).not.toContain('subtitleBoundaryActiveRef');
    expect(source).not.toContain('beginVisualSpeech(text, emotion, estimatedDuration, { subtitleProgression: false });');
    expect(source).toMatch(/await sound\.playAsync\(\);[\s\S]*?await playbackStartedPromise;/s);
    expect(source).toContain('options.subtitleInitiallyHidden ? SUBTITLE_SYNC_DELAY_MS : 0');
  });

  test('starts subtitles and mouth animation only when audible playback begins', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );
    const browserTtsBody = source.match(/const playWithBrowserTTS = useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0] || '';
    const generatedTtsBody = source.match(/const playWithPhonemes = useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0] || '';

    expect(browserTtsBody).toMatch(/utterance\.onstart = \(\) => \{[\s\S]*?beginVisualSpeechForRun\(/);
    expect(browserTtsBody.indexOf('utterance.onstart')).toBeLessThan(browserTtsBody.indexOf('window.speechSynthesis.speak(utterance)'));
    expect(generatedTtsBody).toMatch(/status\.isLoaded[\s\S]*?status\.isPlaying[\s\S]*?beginVisualSpeechForRun\(/);
    expect(generatedTtsBody).not.toMatch(/const runId = beginVisualSpeech\(text, emotion, estimatedDuration/);
  });

  test('shows pending text immediately while keeping motion aligned to audible playback', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain('const SUBTITLE_SYNC_DELAY_MS = 0;');
    expect(source).toContain('subtitleInitiallyHidden?: boolean;');
    expect(source).toContain('showPendingSpeechText(text, estimatedDuration);');
    expect(source).toMatch(/utterance\.onstart = \(\) => \{[\s\S]*?subtitleInitiallyHidden: false/);
    expect(source).toMatch(/status\.isPlaying[\s\S]*?subtitleInitiallyHidden: false/);
    expect(source).toContain('const subtitleElapsed = elapsed - SUBTITLE_SYNC_DELAY_MS;');
  });

  test('does not let stale timers or estimated MP3 duration stop active audio', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain('speechRunIdRef.current !== runId');
    expect(source).toContain('status.durationMillis');
    expect(source).toContain('scheduleVisualStop(actualDuration + 5000, runId);');
    expect(source).toContain('finishSpeechRun(runId, text);');
    expect(source).toContain('const TTS_WEB_FALLBACK_MS = 12000;');
  });

  test('uses the young female guide voice and a stable browser fallback', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain("const DEFAULT_TTS_VOICE_ID = 'female';");
    expect(source).toContain('const DEFAULT_BROWSER_RATE = 0.94;');
    expect(source).toContain('selectPreferredChineseVoice');
    expect(source).toContain('fetchTTS(text, voiceId)');
  });

  test('shows the exact text belonging to the active audio run', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    expect(source).toContain("speechText: ''");
    expect(source).toContain('speechText: text');
    expect(source).toMatch(/isSpeaking: false,[\s\S]*?speechText: '',[\s\S]*?subtitle: ''/);
  });
});
