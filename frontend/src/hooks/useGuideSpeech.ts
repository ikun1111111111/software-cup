import { useCallback, useRef, useState } from 'react';
import { synthesizeSpeech, type PhonemeTimestamp } from '../api/tts';
import type { Emotion } from '../components/DigitalHuman/EmotionController';
import { detectEmotion } from '../utils/emotion';

interface SpeakOptions {
  emotion?: Emotion;
  onComplete?: () => void;
  onError?: () => void;
}

interface UseGuideSpeechReturn {
  isSpeaking: boolean;
  audioChunks: string[];
  phonemes: PhonemeTimestamp[] | null;
  emotion: Emotion;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  setEmotion: (emotion: Emotion) => void;
  /** Start a new combined chat+TTS stream session. */
  startStream: () => void;
  /** Append a base64 audio chunk from the combined stream. */
  appendAudioChunk: (chunk: string) => void;
  /** Replace the active phoneme timestamp list. */
  setPhonemes: (phonemes: PhonemeTimestamp[] | null) => void;
  /** Manually set speaking state (e.g. when streamed audio ends). */
  setSpeaking: (speaking: boolean) => void;
}

const SEGMENT_COMPLETE_PAUSE_MS = 1000;
const COMPLETION_FALLBACK_BUFFER_MS = 2200;

function estimateSpeechDurationMs(text: string): number {
  const readableLength = text.replace(/\s+/g, '').length;
  const sentencePauses = (text.match(/[。！？!?；;]/g) || []).length * 520;
  const shortPauses = (text.match(/[，、,：:]/g) || []).length * 220;
  return Math.max(1800, readableLength * 260 + sentencePauses + shortPauses + 700);
}

/**
 * 数字人导览语音驱动 hook。
 * 统一管理 TTS、口型、情绪和说话状态。
 */
export function useGuideSpeech(): UseGuideSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [phonemes, setPhonemesState] = useState<PhonemeTimestamp[] | null>(null);
  const [emotion, setEmotionState] = useState<Emotion>('neutral');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const pendingCompleteRef = useRef<(() => void) | null>(null);
  const speechRunRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupSpeechState = useCallback(() => {
    setIsSpeaking(false);
    setAudioChunks([]);
    setPhonemesState(null);
  }, []);

  const scheduleComplete = useCallback(
    (delayMs = 0) => {
      const complete = pendingCompleteRef.current;
      if (!complete || abortRef.current) return;
      pendingCompleteRef.current = null;
      clearTimer();
      cleanupSpeechState();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!abortRef.current) complete();
      }, delayMs);
    },
    [cleanupSpeechState, clearTimer]
  );

  const stop = useCallback(() => {
    speechRunRef.current += 1;
    abortRef.current = true;
    pendingCompleteRef.current = null;
    clearTimer();
    cleanupSpeechState();
  }, [cleanupSpeechState, clearTimer]);

  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    if (!text.trim()) {
      options?.onComplete?.();
      return;
    }

    const speakStart = performance.now();
    console.log('[guideSpeech] speak start', { textLength: text.length });

    stop();
    const runId = speechRunRef.current + 1;
    speechRunRef.current = runId;
    abortRef.current = false;

    const detected = options?.emotion || detectEmotion(text);
    pendingCompleteRef.current = options?.onComplete || null;
    setEmotionState(detected);
    setAudioChunks([]);
    setPhonemesState(null);
    setIsSpeaking(true);

    try {
      // Stream TTS: feed audio chunks as they arrive so AudioSync can start playing early.
      let firstChunkLogged = false;
      const result = await synthesizeSpeech(
        text,
        undefined,
        (chunk) => {
          if (abortRef.current || speechRunRef.current !== runId) return;
          if (!firstChunkLogged) {
            firstChunkLogged = true;
            console.log('[guideSpeech] first tts chunk', {
              elapsedMs: Math.round(performance.now() - speakStart),
            });
          }
          setAudioChunks((prev) => [...prev, chunk]);
        },
        (phonemes) => {
          if (abortRef.current || speechRunRef.current !== runId) return;
          setPhonemesState(phonemes);
        }
      );
      if (abortRef.current || speechRunRef.current !== runId) return;

      console.log('[guideSpeech] tts complete', {
        elapsedMs: Math.round(performance.now() - speakStart),
        chunks: result.audioChunks.length,
        durationMs: result.durationMs,
      });

      if (result.audioChunks.length === 0) {
        console.warn('[guideSpeech] Alibaba Cloud returned no audio');
        cleanupSpeechState();
        options?.onError?.();
        return;
      }

      const minimumDuration = estimateSpeechDurationMs(text);
      const duration = Math.max(result.durationMs || 0, minimumDuration) + COMPLETION_FALLBACK_BUFFER_MS;
      timerRef.current = setTimeout(() => {
        if (!abortRef.current && speechRunRef.current === runId) {
          scheduleComplete(SEGMENT_COMPLETE_PAUSE_MS);
        }
      }, duration);
    } catch (error) {
      if (abortRef.current || speechRunRef.current !== runId) return;
      console.warn('[guideSpeech] Alibaba Cloud TTS failed', error);
      cleanupSpeechState();
      options?.onError?.();
    }
  }, [cleanupSpeechState, scheduleComplete, stop]);

  const setEmotion = useCallback((next: Emotion) => {
    setEmotionState(next);
  }, []);

  const startStream = useCallback(() => {
    speechRunRef.current += 1;
    abortRef.current = false;
    pendingCompleteRef.current = null;
    clearTimer();
    setIsSpeaking(true);
    setAudioChunks([]);
    setPhonemesState(null);
  }, [clearTimer]);

  const appendAudioChunk = useCallback((chunk: string) => {
    if (abortRef.current) return;
    setAudioChunks((prev) => [...prev, chunk]);
  }, []);

  const setPhonemes = useCallback((phonemes: PhonemeTimestamp[] | null) => {
    if (abortRef.current) return;
    setPhonemesState(phonemes);
  }, []);

  const setSpeaking = useCallback((speaking: boolean) => {
    if (!speaking && pendingCompleteRef.current) {
      scheduleComplete(SEGMENT_COMPLETE_PAUSE_MS);
      return;
    }
    setIsSpeaking(speaking);
  }, [scheduleComplete]);

  return {
    isSpeaking,
    audioChunks,
    phonemes,
    emotion,
    speak,
    stop,
    setEmotion,
    startStream,
    appendAudioChunk,
    setPhonemes,
    setSpeaking,
  };
}

export default useGuideSpeech;
