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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
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
          } else if (currentEvent === 'done') {
            durationMs = parsed.duration_ms || 0;
          }
        } catch {
          // ignore parse errors
        }
        currentEvent = '';
      }
    }
  }

  return { audioChunks, phonemes, durationMs };
}
