/**
 * Chat SSE API client for the combined chat + TTS stream.
 */

export interface ChatStreamEvent {
  event: string;
  data: any;
}

export interface ChatStreamParams {
  session_id: string;
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  voice_id?: string;
}

const SSE_TIMEOUT_MS = 60000;

/**
 * Stream chat+TTS events from /api/chat/stream_with_tts.
 *
 * Yields parsed SSE events:
 *   - token, chunk, tts_audio, tts_phonemes, card, faq_hit, cache_hit, done, error
 */
export async function* streamChatWithTTS(
  params: ChatStreamParams,
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const requestStart = performance.now();
  const url = '/api/chat/stream_with_tts';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    ),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  console.log('[chat_stream] connected', { elapsedMs: Math.round(performance.now() - requestStart) });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let firstTokenLogged = false;
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      if (line === '') {
        currentEvent = '';
        continue;
      }
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const rawData = line.slice(6);
        if (rawData === '[DONE]') {
          yield { event: 'done', data: {} };
          return;
        }
        let parsedData: any = rawData;
        try {
          parsedData = JSON.parse(rawData.trim());
        } catch {
          // keep raw string
        }
        if ((currentEvent === 'token' || currentEvent === 'faq_hit') && !firstTokenLogged) {
          firstTokenLogged = true;
          console.log('[chat_stream] first event', {
            event: currentEvent,
            elapsedMs: Math.round(performance.now() - requestStart),
          });
        }
        yield { event: currentEvent || 'message', data: parsedData };
      }
    }
  }
}

/**
 * Convenience wrapper: returns { iterable, abort } so callers can cancel the stream.
 */
export function createChatStream(params: ChatStreamParams) {
  const abortController = new AbortController();
  const iterable = streamChatWithTTS(params, abortController.signal);
  return {
    iterable,
    abort: () => abortController.abort(),
  };
}

/**
 * Post a raw audio blob to the ASR endpoint and return the transcribed text.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice.wav');

  const response = await fetch('/api/asr', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`ASR ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.text || '';
}
