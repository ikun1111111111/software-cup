import { useCallback, useEffect, useRef, useState } from 'react';

type PreviewErrorHandler = (error: Error) => void;

export function useStaticVoicePreview(onError?: PreviewErrorHandler) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const finalizeAudio = useCallback((audio: HTMLAudioElement, reset = true) => {
    if (audioRef.current !== audio) {
      return false;
    }

    audio.onended = null;
    audio.onerror = null;
    if (reset) {
      audio.pause();
      audio.currentTime = 0;
    }

    audioRef.current = null;
    setPlayingVoiceId(null);
    return true;
  }, []);

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      finalizeAudio(audio);
    } else {
      setPlayingVoiceId(null);
    }
  }, [finalizeAudio]);

  const togglePreview = useCallback(async (voiceId: string, previewUrl: string) => {
    if (playingVoiceId === voiceId) {
      stopPreview();
      return;
    }

    stopPreview();
    const audio = new Audio(previewUrl);
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.onended = () => {
      finalizeAudio(audio, false);
    };
    audio.onerror = () => {
      if (finalizeAudio(audio)) {
        onError?.(new Error(`Voice preview failed: ${previewUrl}`));
      }
    };

    try {
      await audio.play();
      if (audioRef.current === audio) {
        setPlayingVoiceId(voiceId);
      }
    } catch (error) {
      if (!finalizeAudio(audio)) {
        return;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      onError?.(error instanceof Error ? error : new Error('Voice preview failed'));
    }
  }, [finalizeAudio, onError, playingVoiceId, stopPreview]);

  useEffect(() => stopPreview, [stopPreview]);

  return { playingVoiceId, togglePreview, stopPreview };
}
