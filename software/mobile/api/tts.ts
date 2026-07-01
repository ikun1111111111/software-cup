/**
 * TTS API client for mobile.
 * Calls backend /api/tts/cache to get audio + phoneme timestamps.
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

export interface Phoneme {
  char: string;
  start_ms: number;
  end_ms: number;
  mouth_shape: 'closed' | 'open' | 'half';
}

export interface TTSResult {
  audioUri: string;
  phonemes: Phoneme[];
  durationMs: number;
  audioFormat: 'mp3' | 'wav';
}

function base64ToBlobUrl(base64: string, mime = 'audio/mpeg'): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export async function fetchTTS(
  text: string,
  voiceId?: string,
): Promise<TTSResult> {
  const response = await fetch(`${API_BASE_URL}/tts/cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });

  if (!response.ok) {
    throw new Error(`TTS request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.cached || !data.audio_base64) {
    throw new Error('TTS audio not available');
  }

  const audioFormat: 'mp3' | 'wav' = data.audio_format === 'wav' ? 'wav' : 'mp3';
  let audioUri: string;
  if (Platform.OS === 'web') {
    audioUri = base64ToBlobUrl(data.audio_base64, audioFormat === 'wav' ? 'audio/wav' : 'audio/mpeg');
  } else {
    const FileSystem = require('expo-file-system');
    const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.${audioFormat}`;
    await FileSystem.writeAsStringAsync(fileUri, data.audio_base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    audioUri = fileUri;
  }

  return {
    audioUri,
    phonemes: data.phonemes || [],
    durationMs: data.duration_ms || 0,
    audioFormat,
  };
}
