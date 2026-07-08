import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Phoneme } from './LipSync';

export interface AudioSyncProps {
  audioUrl?: string;
  /** Streaming audio chunks as base64-encoded strings (from SSE). */
  audioChunks?: string[];
  /** Phoneme timestamps for lip-sync. */
  phonemes?: Phoneme[] | null;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Current playback time in milliseconds (for phoneme matching). */
  onTimeUpdateMs?: (currentTimeMs: number) => void;
  onPhonemes?: (phonemes: Phoneme[]) => void;
  onError?: (error: string) => void;
}

const AudioSync: React.FC<AudioSyncProps> = ({
  audioUrl,
  audioChunks,
  phonemes,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onTimeUpdateMs,
  onPhonemes,
  onError,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const accumulatedChunksRef = useRef<string[]>([]);
  const lastChunkCountRef = useRef(0);
  const listenersRef = useRef<{
    play?: () => void;
    pause?: () => void;
    ended?: () => void;
    loadedmetadata?: () => void;
    error?: () => void;
  }>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const reportTime = useCallback(() => {
    if (!mountedRef.current || !audioRef.current) return;
    const ct = audioRef.current.currentTime || 0;
    const dur = audioRef.current.duration || 0;
    onTimeUpdate?.(ct, dur);
    onTimeUpdateMs?.(ct * 1000);
  }, [onTimeUpdate, onTimeUpdateMs]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      if (!audioRef.current || audioRef.current.paused || audioRef.current.ended) return;
      reportTime();
    }, 50);
  }, [reportTime, stopPolling]);

  // Release all audio resources
  const cleanupAudio = useCallback(() => {
    stopPolling();
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.src = '';
      audio.load?.();
      if (listenersRef.current.play) audio.removeEventListener('play', listenersRef.current.play);
      if (listenersRef.current.pause) audio.removeEventListener('pause', listenersRef.current.pause);
      if (listenersRef.current.ended) audio.removeEventListener('ended', listenersRef.current.ended);
      if (listenersRef.current.loadedmetadata)
        audio.removeEventListener('loadedmetadata', listenersRef.current.loadedmetadata);
      if (listenersRef.current.error) audio.removeEventListener('error', listenersRef.current.error);
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    accumulatedChunksRef.current = [];
    lastChunkCountRef.current = 0;
    listenersRef.current = {};
  }, [stopPolling]);

  // Forward phonemes to parent when received
  useEffect(() => {
    if (phonemes && phonemes.length > 0) {
      onPhonemes?.(phonemes);
    }
  }, [phonemes, onPhonemes]);

  // Append streaming audio chunks to a single Audio element without rebuilding it.
  useEffect(() => {
    if (!audioChunks) return;
    if (!mountedRef.current) return;

    const newChunks = audioChunks.slice(lastChunkCountRef.current);
    if (newChunks.length === 0 && audioChunks.length === 0) {
      // Source reset: tear down if nothing is playing.
      if (audioRef.current && audioRef.current.paused) {
        cleanupAudio();
      }
      return;
    }
    if (newChunks.length === 0) return;

    accumulatedChunksRef.current = audioChunks.slice();
    lastChunkCountRef.current = audioChunks.length;

    try {
      const binaryChunks = accumulatedChunksRef.current.map((b64) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      });

      const totalLength = binaryChunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of binaryChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = new Blob([merged], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = url;

      const createFreshAudio = () => {
        const audio = new Audio(url);
        audioRef.current = audio;

        const handlePlay = () => {
          if (!mountedRef.current) return;
          setIsPlaying(true);
          onPlay?.();
          startPolling();
        };
        const handlePause = () => {
          if (!mountedRef.current) return;
          setIsPlaying(false);
          onPause?.();
          stopPolling();
        };
        const handleEnded = () => {
          if (!mountedRef.current) return;
          setIsPlaying(false);
          setCurrentTime(0);
          onEnded?.();
          stopPolling();
        };
        const handleLoadedMetadata = () => {
          if (!mountedRef.current) return;
          setDuration(audio.duration || 0);
        };
        const handleError = () => {
          if (!mountedRef.current) return;
          onError?.('Failed to load streamed audio');
        };

        listenersRef.current = {
          play: handlePlay,
          pause: handlePause,
          ended: handleEnded,
          loadedmetadata: handleLoadedMetadata,
          error: handleError,
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);

        if (autoPlay) {
          audio.play().catch(() => {});
        }
      };

      if (audioRef.current) {
        const audio = audioRef.current;
        const wasPlaying = !audio.paused && !audio.ended;
        const previousTime = audio.currentTime || 0;

        audio.pause();
        audio.src = url;
        audio.load?.();

        // Restore playback position, clamped to the new duration once known.
        const restoreTime = () => {
          const dur = audio.duration || 0;
          const target = dur > 0 ? Math.min(previousTime, dur * 0.999) : previousTime;
          try {
            audio.currentTime = target;
          } catch {
            // ignore
          }
        };

        audio.addEventListener('loadedmetadata', restoreTime, { once: true });

        if (autoPlay || wasPlaying) {
          // Give the browser a tick to decode the new source before resuming.
          requestAnimationFrame(() => {
            if (!mountedRef.current || audio !== audioRef.current) return;
            audio.play().catch(() => {});
          });
        }
      } else {
        createFreshAudio();
      }
    } catch (err) {
      if (mountedRef.current) {
        onError?.('Failed to decode streamed audio chunks');
      }
    }
  }, [audioChunks, autoPlay, onPlay, onPause, onEnded, onError, startPolling, stopPolling, cleanupAudio]);

  // Standalone audio URL playback (non-streaming fallback)
  useEffect(() => {
    if (!audioUrl) return;
    if (!mountedRef.current) return;

    cleanupAudio();

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handlePlay = () => {
      if (!mountedRef.current) return;
      setIsPlaying(true);
      onPlay?.();
      startPolling();
    };
    const handlePause = () => {
      if (!mountedRef.current) return;
      setIsPlaying(false);
      onPause?.();
      stopPolling();
    };
    const handleEnded = () => {
      if (!mountedRef.current) return;
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
      stopPolling();
    };
    const handleLoadedMetadata = () => {
      if (!mountedRef.current) return;
      setDuration(audio.duration || 0);
    };
    const handleError = () => {
      if (!mountedRef.current) return;
      onError?.('Failed to load audio');
    };

    listenersRef.current = {
      play: handlePlay,
      pause: handlePause,
      ended: handleEnded,
      loadedmetadata: handleLoadedMetadata,
      error: handleError,
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    if (autoPlay) {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, autoPlay, onPlay, onPause, onEnded, onError, startPolling, stopPolling, cleanupAudio]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <div data-testid="audio-sync" style={{ display: 'none' }}>
      <span data-testid="is-playing">{isPlaying.toString()}</span>
      <span data-testid="current-time">{currentTime.toFixed(2)}</span>
      <span data-testid="duration">{duration.toFixed(2)}</span>
    </div>
  );
};

export default AudioSync;
