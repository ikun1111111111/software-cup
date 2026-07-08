import { useCallback, useRef, useState } from 'react';
import { streamChatWithTTS, type ChatStreamParams, type ChatStreamEvent } from '../api/chat';
import { useDigitalHuman } from '../components/tourist/DigitalHumanProvider';
import { isThemeCard, type ThemeCard } from '../types/themeCards';
import type { PhonemeTimestamp } from '../api/tts';

export function computeVisibleCharCount(
  text: string,
  phonemes: PhonemeTimestamp[] | null,
  currentTimeMs: number
): number {
  if (!text) return 0;
  if (!phonemes || phonemes.length === 0 || currentTimeMs <= 0) {
    return text.length;
  }

  let count = 0;
  let matchedIndex = -1;
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    if (p.start_ms <= currentTimeMs) {
      count += p.char.length;
      matchedIndex = i;
    } else {
      break;
    }
  }

  const lastPhoneme = phonemes[phonemes.length - 1];
  if (matchedIndex === phonemes.length - 1 && currentTimeMs >= lastPhoneme.end_ms) {
    return text.length;
  }

  return Math.min(count, text.length);
}

export interface UseAudioSyncControllerOptions {
  /** Called for every streamed text token. */
  onToken?: (token: string) => void;
  /** Called when a final answer is available (faq_hit / cache_hit / done). */
  onAnswer?: (answer: string, meta: { source: string; topic: string; card?: ThemeCard }) => void;
  /** Called when a card event is received. */
  onCard?: (card: ThemeCard) => void;
  /** Called on stream error. */
  onError?: (error: string) => void;
  /** Called when only TTS failed but text answer is still valid. */
  onTtsError?: (error: string) => void;
  /** Called when stream begins. */
  onStart?: () => void;
}

export interface UseAudioSyncControllerReturn {
  isStreaming: boolean;
  start: (params: ChatStreamParams) => void;
  stop: () => void;
  topic: string | null;
  card: ThemeCard | null;
  error: string | null;
}

/**
 * Unified controller for the combined chat + TTS SSE stream.
 *
 * - Streams text tokens to the UI.
 * - Appends base64 audio chunks to the digital human guide as they arrive.
 * - Applies phoneme timestamps for lip-sync.
 * - Surfaces theme cards and topic metadata.
 */
export function useAudioSyncController(
  options: UseAudioSyncControllerOptions = {}
): UseAudioSyncControllerReturn {
  const guide = useDigitalHuman();
  const [isStreaming, setIsStreaming] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [card, setCard] = useState<ThemeCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);
  const activeRef = useRef(false);
  const finalAnswerRef = useRef('');
  const streamAudioReceivedRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    guide.stop();
    setIsStreaming(false);
  }, [guide]);

  const start = useCallback(
    (params: ChatStreamParams) => {
      // Interrupt any ongoing speech/stream
      stop();
      activeRef.current = true;
      finalAnswerRef.current = '';
      streamAudioReceivedRef.current = false;
      setTopic(null);
      setCard(null);
      setError(null);
      setIsStreaming(true);
      options.onStart?.();

      guide.startStream();

      const { iterable, abort } = (() => {
        const abortController = new AbortController();
        return {
          iterable: streamChatWithTTS(params, abortController.signal),
          abort: () => abortController.abort(),
        };
      })();

      abortRef.current = abort;

      (async () => {
        try {
          let finalTopic = 'general';
          let finalSource = 'rag';
          let finalCard: ThemeCard | undefined;

          for await (const msg of iterable) {
            if (!activeRef.current) break;
            handleEvent(msg);
          }

          function handleEvent(msg: ChatStreamEvent) {
            switch (msg.event) {
              case 'token': {
                const token = msg.data?.token || '';
                finalAnswerRef.current += token;
                options.onToken?.(token);
                break;
              }
              case 'chunk':
                // Retrieved knowledge chunks are logged; the UI can surface them if desired.
                break;
              case 'tts_audio': {
                const data = msg.data?.data;
                if (typeof data === 'string' && data) {
                  streamAudioReceivedRef.current = true;
                  guide.appendAudioChunk(data);
                }
                break;
              }
              case 'tts_error': {
                const errMsg = msg.data?.error || '语音合成暂不可用，已切换浏览器语音';
                console.warn('[chat_stream] tts_error', errMsg);
                options.onTtsError?.(errMsg);
                if (!streamAudioReceivedRef.current && finalAnswerRef.current.trim()) {
                  void guide.speak(finalAnswerRef.current);
                }
                break;
              }
              case 'tts_phonemes': {
                const phonemes = msg.data?.data;
                if (Array.isArray(phonemes)) {
                  guide.setPhonemes(phonemes);
                }
                break;
              }
              case 'card': {
                const receivedCard = msg.data as ThemeCard | undefined;
                if (receivedCard && isThemeCard(receivedCard)) {
                  finalCard = receivedCard;
                  setCard(receivedCard);
                  options.onCard?.(receivedCard);
                }
                break;
              }
              case 'faq_hit': {
                finalAnswerRef.current = msg.data?.answer || '';
                finalTopic = msg.data?.topic || finalTopic;
                finalSource = 'faq';
                finalCard = msg.data?.card || finalCard;
                setTopic(finalTopic);
                setCard(finalCard || null);
                options.onAnswer?.(finalAnswerRef.current, {
                  source: finalSource,
                  topic: finalTopic,
                  card: finalCard,
                });
                break;
              }
              case 'cache_hit': {
                finalAnswerRef.current = msg.data?.answer || '';
                finalTopic = msg.data?.topic || finalTopic;
                finalSource = 'cache';
                finalCard = msg.data?.card || finalCard;
                setTopic(finalTopic);
                setCard(finalCard || null);
                options.onAnswer?.(finalAnswerRef.current, {
                  source: finalSource,
                  topic: finalTopic,
                  card: finalCard,
                });
                break;
              }
              case 'done': {
                finalAnswerRef.current = msg.data?.answer || finalAnswerRef.current;
                finalTopic = msg.data?.topic || finalTopic;
                finalSource = msg.data?.source || finalSource;
                finalCard = msg.data?.card || finalCard;
                setTopic(finalTopic);
                setCard(finalCard || null);
                options.onAnswer?.(finalAnswerRef.current, {
                  source: finalSource,
                  topic: finalTopic,
                  card: finalCard,
                });
                setIsStreaming(false);
                break;
              }
              case 'error': {
                const errMsg = msg.data?.error || '生成回答时出错，请稍后重试';
                setError(errMsg);
                options.onError?.(errMsg);
                setIsStreaming(false);
                break;
              }
              default:
                break;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsStreaming(false);
            return;
          }
          const errMsg = err?.message || '连接错误，请重试';
          setError(errMsg);
          options.onError?.(errMsg);
          setIsStreaming(false);
        } finally {
          abortRef.current = null;
        }
      })();
    },
    [guide, options, stop]
  );

  return {
    isStreaming,
    start,
    stop,
    topic,
    card,
    error,
  };
}

export default useAudioSyncController;
