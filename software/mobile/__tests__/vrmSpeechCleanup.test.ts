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
    expect(source).toContain('scheduleVisualStop(estimatedDuration + 1000);');
    expect(source).toContain('window.speechSynthesis.speak(utterance);');
  });

  test('keeps timed subtitle progression alive while accepting browser speech boundaries', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );
    const boundarySyncBody = source.match(/const syncSubtitleToSpeechBoundary = useCallback\([\s\S]*?\n  \}, \[\]\);/)?.[0] || '';

    expect(source).toContain('utterance.onboundary = (event) => {');
    expect(source).toContain('syncSubtitleToSpeechBoundary(event.charIndex);');
    expect(source).toContain('const subtitleCueIndexRef = useRef(0);');
    expect(boundarySyncBody).toContain('subtitleCueIndexRef.current = cueIndex;');
    expect(boundarySyncBody).not.toContain('clearSubtitleTimer();');
    expect(source).not.toContain('subtitleBoundaryActiveRef');
    expect(source).toContain('beginVisualSpeech(text, emotion, estimatedDuration, { subtitleProgression: false });');
    expect(source).toMatch(/await sound\.playAsync\(\);[\s\S]*?const actualDuration = result\.durationMs > 0 \? result\.durationMs : estimatedDuration;[\s\S]*?startSubtitleProgression\(text, actualDuration\);/s);
  });
});
