import { describe, it, expect } from 'vitest';
import { computeVisibleCharCount } from '../hooks/useAudioSyncController';
import type { PhonemeTimestamp } from '../api/tts';

const makePhonemes = (chars: string[]): PhonemeTimestamp[] => {
  let ms = 0;
  return chars.map((char) => {
    const start = ms;
    const end = ms + 200;
    ms = end;
    return { char, start_ms: start, end_ms: end, mouth_shape: 'open' as const };
  });
};

describe('computeVisibleCharCount', () => {
  it('empty text returns 0', () => {
    expect(computeVisibleCharCount('', null, 0)).toBe(0);
  });

  it('without phonemes shows full text', () => {
    expect(computeVisibleCharCount('灵山大佛', null, 0)).toBe(4);
    expect(computeVisibleCharCount('灵山大佛', [], 100)).toBe(4);
  });

  it('before audio starts shows full text', () => {
    const phonemes = makePhonemes(['灵', '山', '大', '佛']);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 0)).toBe(4);
    expect(computeVisibleCharCount('灵山大佛', phonemes, -10)).toBe(4);
  });

  it('shows characters up to current phoneme time', () => {
    const phonemes = makePhonemes(['灵', '山', '大', '佛']);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 50)).toBe(1);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 250)).toBe(2);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 450)).toBe(3);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 650)).toBe(4);
  });

  it('shows full text after last phoneme ends', () => {
    const phonemes = makePhonemes(['灵', '山']);
    expect(computeVisibleCharCount('灵山', phonemes, 500)).toBe(2);
  });

  it('clamps to text length when phoneme count exceeds text', () => {
    const phonemes = makePhonemes(['灵', '山', '大', '佛', '高']);
    expect(computeVisibleCharCount('灵山', phonemes, 1000)).toBe(2);
  });

  it('handles multi-char phoneme entries', () => {
    const phonemes: PhonemeTimestamp[] = [
      { char: '灵山', start_ms: 0, end_ms: 300, mouth_shape: 'open' },
      { char: '大佛', start_ms: 300, end_ms: 600, mouth_shape: 'open' },
    ];
    expect(computeVisibleCharCount('灵山大佛', phonemes, 150)).toBe(2);
    expect(computeVisibleCharCount('灵山大佛', phonemes, 400)).toBe(4);
  });
});
