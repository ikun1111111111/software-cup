const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';

interface UnlockAudio {
  volume: number;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
}

let unlockPromise: Promise<boolean> | null = null;

/** Unlock delayed TTS playback while the browser still has a user gesture. */
export function primeWebAudioPlayback(
  createAudio?: () => UnlockAudio,
): Promise<boolean> {
  if (unlockPromise) return unlockPromise;

  const factory = createAudio ?? (() => {
    if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
      return null;
    }
    return new window.Audio(SILENT_WAV_DATA_URI);
  });
  const audio = factory();
  if (!audio) return Promise.resolve(false);

  audio.volume = 0;
  unlockPromise = Promise.resolve(audio.play())
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      return true;
    })
    .catch(() => {
      unlockPromise = null;
      return false;
    });
  return unlockPromise;
}
