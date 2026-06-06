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
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Forward phonemes to parent when received
  useEffect(() => {
    if (phonemes && phonemes.length > 0) {
      onPhonemes?.(phonemes);
    }
  }, [phonemes, onPhonemes]);

  // Build audio from streaming base64 chunks
  useEffect(() => {
    if (!audioChunks || audioChunks.length === 0) return;

    try {
      const binaryChunks = audioChunks.map((b64) => {
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

      // Clean up previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };
      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onEnded?.();
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = undefined;
        }
      };
      const reportTime = () => {
        const ct = audio.currentTime;
        const dur = audio.duration || 0;
        setCurrentTime(ct);
        setDuration(dur);
        onTimeUpdate?.(ct, dur);
        onTimeUpdateMs?.(ct * 1000);
      };
      const handleLoadedMetadata = () => {
        setDuration(audio.duration || 0);
      };
      const handleError = () => {
        onError?.('Failed to load streamed audio');
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      // Poll audio.currentTime at 50ms for reliable lip-sync
      // (timeupdate only fires ~4/sec, too slow)
      if (autoPlay) {
        audio.play().catch(() => {});
        pollRef.current = setInterval(() => {
          if (audio.paused || audio.ended) return;
          reportTime();
        }, 50);
      }

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        audio.pause();
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = undefined;
        }
        audioRef.current = null;
      };
    } catch (err) {
      onError?.('Failed to decode streamed audio chunks');
    }
  }, [audioChunks, autoPlay, onPlay, onPause, onEnded, onTimeUpdate, onTimeUpdateMs, onError]);

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        onError?.(err.message || 'Failed to play audio');
      });
    }
  }, [onError]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = undefined;
      }
    };

    const reportTime = () => {
      const ct = audio.currentTime;
      const dur = audio.duration || 0;
      setCurrentTime(ct);
      setDuration(dur);
      onTimeUpdate?.(ct, dur);
      onTimeUpdateMs?.(ct * 1000);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleError = () => {
      const errorMsg = 'Failed to load audio';
      onError?.(errorMsg);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    if (autoPlay) {
      audio.play().catch(() => {});
      pollRef.current = setInterval(() => {
        if (audio.paused || audio.ended) return;
        reportTime();
      }, 50);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.pause();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = undefined;
      }
      audioRef.current = null;
    };
  }, [audioUrl, autoPlay, onPlay, onPause, onEnded, onTimeUpdate, onTimeUpdateMs, onError]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return (
    <div data-testid="audio-sync" style={{ display: 'none' }}>
      <span data-testid="is-playing">{isPlaying.toString()}</span>
      <span data-testid="current-time">{currentTime.toFixed(2)}</span>
      <span data-testid="duration">{duration.toFixed(2)}</span>
    </div>
  );
};

export default AudioSync;
