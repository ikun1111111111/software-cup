import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGuideSpeech } from '../hooks/useGuideSpeech';

const mockSynthesizeSpeech = vi.hoisted(() => vi.fn());

vi.mock('../api/tts', () => ({
  synthesizeSpeech: mockSynthesizeSpeech,
}));

vi.mock('../utils/emotion', () => ({
  detectEmotion: () => 'smile',
}));

describe('useGuideSpeech', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSynthesizeSpeech.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for a conservative minimum duration when server TTS duration is too short', async () => {
    mockSynthesizeSpeech.mockImplementation(async (_text, _voice, onChunk) => {
      onChunk?.('ZmFrZQ==');
      return {
        audioChunks: ['ZmFrZQ=='],
        phonemes: [],
        durationMs: 500,
      };
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useGuideSpeech());

    await act(async () => {
      await result.current.speak('现在是16:40。我按你当前所在的大佛广场来推荐下一段路线。', {
        emotion: 'smile',
        onComplete,
      });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('continues one second after the audio playback ended event', async () => {
    mockSynthesizeSpeech.mockImplementation(async (_text, _voice, onChunk) => {
      onChunk?.('ZmFrZQ==');
      return {
        audioChunks: ['ZmFrZQ=='],
        phonemes: [],
        durationMs: 12000,
      };
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useGuideSpeech());

    await act(async () => {
      await result.current.speak('第一段讲解已经读完，准备稍作停顿后进入下一段。', {
        emotion: 'smile',
        onComplete,
      });
    });

    act(() => {
      result.current.setSpeaking(false);
      vi.advanceTimersByTime(999);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores stale server TTS results after a newer speech starts', async () => {
    let resolveFirst!: () => void;

    mockSynthesizeSpeech
      .mockImplementationOnce((_text, _voice, onChunk) => {
        return new Promise((resolve) => {
          resolveFirst = () => {
            onChunk?.('old-audio');
            resolve({
              audioChunks: ['old-audio'],
              phonemes: [],
              durationMs: 1000,
            });
          };
        });
      })
      .mockImplementationOnce(async (_text, _voice, onChunk) => {
        onChunk?.('new-audio');
        return {
          audioChunks: ['new-audio'],
          phonemes: [],
          durationMs: 1000,
        };
      });

    const { result } = renderHook(() => useGuideSpeech());
    let firstSpeech!: Promise<void>;

    act(() => {
      firstSpeech = result.current.speak('old route narration');
    });

    await act(async () => {
      await result.current.speak('new focused spot narration');
    });

    expect(result.current.audioChunks).toEqual(['new-audio']);

    await act(async () => {
      resolveFirst();
      await firstSpeech;
    });

    expect(result.current.audioChunks).toEqual(['new-audio']);
  });
});
