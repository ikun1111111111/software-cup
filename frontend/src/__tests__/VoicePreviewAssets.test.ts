import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VOICE_PREVIEW_OPTIONS } from '../config/voicePreviewOptions';

const previewFiles = ['mandarin.mp3', 'female.mp3', 'liaoning.mp3'];

describe('voice preview assets', () => {
  it.each(previewFiles)('provides a valid MP3 for %s', (fileName) => {
    const filePath = resolve(
      process.cwd(),
      'public',
      'audio',
      'voice-previews',
      fileName,
    );
    const bytes = readFileSync(filePath);
    const hasId3Header = bytes.subarray(0, 3).toString('ascii') === 'ID3';
    const hasMpegFrameHeader = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(hasId3Header || hasMpegFrameHeader).toBe(true);
  });

  it('defines distinct URLs and descriptive labels for all voices', () => {
    expect(VOICE_PREVIEW_OPTIONS.map((voice) => voice.id)).toEqual([
      'mandarin',
      'female',
      'liaoning',
    ]);
    expect(new Set(VOICE_PREVIEW_OPTIONS.map((voice) => voice.previewUrl)).size).toBe(3);
    expect(VOICE_PREVIEW_OPTIONS.map((voice) => voice.description)).toEqual([
      '温柔清晰 · 稳重 · 标准普通话',
      '青春明亮 · 轻快 · 更有活力',
      '亲切爽朗 · 地域感 · 更有记忆点',
    ]);
  });
});
