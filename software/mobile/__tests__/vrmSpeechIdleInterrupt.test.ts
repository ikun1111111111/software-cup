import fs from 'fs';
import path from 'path';

describe('VRM speech idle interruption', () => {
  test('marks speech active before TTS loading so idle actions stop immediately', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useVRMSync.ts'),
      'utf8',
    );

    const pendingSpeechBody = source.match(
      /const showPendingSpeechText = useCallback\([\s\S]*?\n  \}, \[prepareInitialSubtitle\]\);/,
    )?.[0] || '';
    const handleSpeakBody = source.match(
      /const handleSpeak = \([\s\S]*?\n    \};/,
    )?.[0] || '';

    expect(pendingSpeechBody).toContain('isSpeaking: true');
    expect(pendingSpeechBody).toContain('mouthOpen: 0');
    expect(handleSpeakBody.indexOf('showPendingSpeechText(text, estimatedDuration)'))
      .toBeLessThan(handleSpeakBody.indexOf('playWithPhonemes(text, emotion)'));
  });

  test('treats speaking as ineligible for waiting animations', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/vrmDemoActionPlayer.ts'),
      'utf8',
    );

    expect(source).toContain("const idleEligible = normalized === 'none' && !speaking");
    expect(source).toContain("if (normalized === 'none' && speaking && this.activeAction?.startsWith('waiting'))");
    expect(source).toContain('this.stopActive();');
  });
});
