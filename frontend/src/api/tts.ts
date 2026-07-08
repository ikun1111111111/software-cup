/**
 * TTS (Text-to-Speech) API client.
 * Calls backend /api/tts/stream to get audio chunks + phonemes for lip-sync.
 */

export interface PhonemeTimestamp {
  char: string;
  start_ms: number;
  end_ms: number;
  mouth_shape: 'closed' | 'open' | 'half';
}

export interface TTSResult {
  audioChunks: string[];
  phonemes: PhonemeTimestamp[];
  durationMs: number;
}

/**
 * Stream TTS audio from backend.
 * Collects all audio chunks and phonemes, returns when done.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId?: string,
  onChunk?: (chunk: string) => void,
  onPhonemes?: (phonemes: PhonemeTimestamp[]) => void,
): Promise<TTSResult> {
  const audioChunks: string[] = [];
  let phonemes: PhonemeTimestamp[] = [];
  let durationMs = 0;

  const response = await fetch('/api/tts/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });

  if (!response.ok) {
    throw new Error(`TTS request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line === '' || line === '\r') {
        currentEvent = '';
        continue;
      }
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const rawData = line.slice(6);
        try {
          const parsed = JSON.parse(rawData);
          if (currentEvent === 'audio' && parsed.data) {
            audioChunks.push(parsed.data);
            onChunk?.(parsed.data);
          } else if (currentEvent === 'phonemes' && parsed.data) {
            phonemes = parsed.data;
            onPhonemes?.(phonemes);
          } else if (currentEvent === 'done') {
            durationMs = parsed.duration_ms || 0;
          } else if (currentEvent === 'error' || currentEvent === 'tts_error') {
            console.warn('[tts] stream unavailable', parsed.error);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  return { audioChunks, phonemes, durationMs };
}

export const previewVoice = async (voiceId: string, text?: string): Promise<string> => {
  const response = await fetch('/api/tts/cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice_id: voiceId,
      text: text || '你好，欢迎来到灵山景区，我是你的数字人导游。',
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS preview failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.cached || !data.audio_base64) {
    throw new Error('TTS 未缓存');
  }

  const byteCharacters = atob(data.audio_base64);
  const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/mp3' });
  return URL.createObjectURL(blob);
};
