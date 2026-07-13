import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStaticVoicePreview } from '../hooks/useStaticVoicePreview';

const audioInstances: MockAudio[] = [];
let playImplementations: Array<() => Promise<void>> = [];

class MockAudio {
  src: string;
  currentTime = 0;
  preload = '';
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return playImplementations.shift()?.() ?? Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src = '') {
    this.src = src;
    audioInstances.push(this);
  }
}

describe('useStaticVoicePreview', () => {
  beforeEach(() => {
    audioInstances.length = 0;
    playImplementations = [];
    vi.stubGlobal('Audio', MockAudio);
  });

  it('plays a static URL and exposes the playing voice id', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));

    expect(audioInstances[0].src).toBe('/audio/mandarin.mp3');
    expect(audioInstances[0].play).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBe('mandarin');
  });

  it('stops the previous preview before playing another voice', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    await act(() => result.current.togglePreview('female', '/audio/female.mp3'));

    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(audioInstances[0].currentTime).toBe(0);
    expect(audioInstances[1].play).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBe('female');
  });

  it('toggles the current voice off', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(result.current.playingVoiceId).toBeNull();
  });

  it('clears playback state and reports an audio error', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticVoicePreview(onError));

    await act(() => result.current.togglePreview('liaoning', '/audio/liaoning.mp3'));
    act(() => audioInstances[0].onerror?.());

    expect(result.current.playingVoiceId).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('clears playback state when audio ends', async () => {
    const { result } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('female', '/audio/female.mp3'));
    act(() => audioInstances[0].onended?.());

    expect(result.current.playingVoiceId).toBeNull();
  });

  it('stops active audio when the component unmounts', async () => {
    const { result, unmount } = renderHook(() => useStaticVoicePreview());

    await act(() => result.current.togglePreview('mandarin', '/audio/mandarin.mp3'));
    unmount();

    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
    expect(audioInstances[0].currentTime).toBe(0);
  });

  it('does not report an error when a stale play promise is cancelled', async () => {
    let rejectFirstPlay: (error: Error) => void = () => undefined;
    playImplementations = [
      () => new Promise<void>((_, reject) => {
        rejectFirstPlay = reject;
      }),
      () => Promise.resolve(),
    ];
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticVoicePreview(onError));

    act(() => {
      void result.current.togglePreview('mandarin', '/audio/mandarin.mp3');
    });
    await act(() => result.current.togglePreview('female', '/audio/female.mp3'));
    await act(async () => {
      rejectFirstPlay(new DOMException('The play() request was interrupted', 'AbortError'));
      await Promise.resolve();
    });

    expect(result.current.playingVoiceId).toBe('female');
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a genuine failure only once when error and rejection both fire', async () => {
    let rejectPlay: (error: Error) => void = () => undefined;
    playImplementations = [
      () => new Promise<void>((_, reject) => {
        rejectPlay = reject;
      }),
    ];
    const onError = vi.fn();
    const { result } = renderHook(() => useStaticVoicePreview(onError));

    act(() => {
      void result.current.togglePreview('liaoning', '/audio/liaoning.mp3');
    });
    act(() => audioInstances[0].onerror?.());
    await act(async () => {
      rejectPlay(new Error('decode failed'));
      await Promise.resolve();
    });

    expect(result.current.playingVoiceId).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });
});
