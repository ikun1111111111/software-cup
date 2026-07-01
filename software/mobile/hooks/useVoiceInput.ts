import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '@/api/config';

export interface VoiceInputOptions {
  language?: string;
  maxDuration?: number;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface WebSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface WebSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  }
}

const IS_WEB = Platform.OS === 'web';

function getWebRecognition(): WebSpeechRecognition | null {
  if (!IS_WEB) return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

/**
 * 语音输入 Hook
 * Web 端优先使用浏览器原生 SpeechRecognition；Native 端录音后调用后端 ASR。
 */
export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const pendingOptionsRef = useRef<VoiceInputOptions | undefined>(undefined);
  const finalTranscriptRef = useRef<string>('');

  const finishRecording = useCallback(() => {
    setIsRecording(false);
    setIsProcessing(false);
    recognitionRef.current = null;
    recordingRef.current = null;
  }, []);

  /**
   * 请求麦克风权限（Native）
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要麦克风权限才能使用语音输入');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async (options?: VoiceInputOptions) => {
    pendingOptionsRef.current = options;
    setTranscript('');
    finalTranscriptRef.current = '';

    if (IS_WEB) {
      const recognition = getWebRecognition();
      if (!recognition) {
        Alert.alert('不支持', '当前浏览器不支持语音输入');
        options?.onError?.(new Error('SpeechRecognition not supported'));
        return;
      }

      recognition.lang = options?.language || 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: WebSpeechRecognitionEvent) => {
        const results = event.results;
        if (!results.length) return;
        const lastResult = results[results.length - 1];
        const text = lastResult.item(0)?.transcript || '';
        setTranscript(text);
        if (lastResult.isFinal) {
          finalTranscriptRef.current = text;
          pendingOptionsRef.current?.onTranscript?.(text);
        }
      };

      recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
        console.error('Web SpeechRecognition error:', event.error);
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          pendingOptionsRef.current?.onError?.(new Error(event.error));
        }
        finishRecording();
      };

      recognition.onend = () => {
        const text = finalTranscriptRef.current;
        if (text) {
          pendingOptionsRef.current?.onTranscript?.(text);
        }
        finishRecording();
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Web SpeechRecognition start failed:', error);
        options?.onError?.(error as Error);
        finishRecording();
      }
      return;
    }

    // Native path
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        options?.maxDuration || 30000,
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Start recording failed:', error);
      Alert.alert('录音失败', '无法启动录音，请检查麦克风权限');
      options?.onError?.(error as Error);
      finishRecording();
    }
  }, [requestPermissions, finishRecording]);

  /**
   * 停止录音并转写
   */
  const stopRecording = useCallback(async (options?: VoiceInputOptions) => {
    const opts = options ?? pendingOptionsRef.current;

    if (IS_WEB) {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      // 让 stopRecording 传入的回调（如 onTranscript）也能被 Web 语音识别使用
      if (options) {
        pendingOptionsRef.current = { ...pendingOptionsRef.current, ...options };
      }
      try {
        recognition.stop();
      } catch (error) {
        console.error('Web SpeechRecognition stop failed:', error);
      }
      return;
    }

    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) {
        throw new Error('No audio URI');
      }

      setAudioUri(uri);

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('language', opts?.language || 'zh-CN');

      const response = await fetch(`${API_BASE_URL}/asr/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ASR API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const text = data.text || '';
      setTranscript(text);
      opts?.onTranscript?.(text);
    } catch (error) {
      console.error('Stop recording failed:', error);
      Alert.alert('转写失败', '语音识别失败，请重试');
      opts?.onError?.(error as Error);
    } finally {
      setIsProcessing(false);
      recordingRef.current = null;
    }
  }, []);

  /**
   * 取消录音
   */
  const cancelRecording = useCallback(async () => {
    if (IS_WEB) {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      finishRecording();
      setTranscript('');
      return;
    }

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
      setTranscript('');
    } catch (error) {
      console.error('Cancel recording failed:', error);
    }
  }, [finishRecording]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(async () => {
    if (IS_WEB) {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      finishRecording();
      return;
    }

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }, [finishRecording]);

  return {
    isRecording,
    isProcessing,
    transcript,
    audioUri,
    startRecording,
    stopRecording,
    cancelRecording,
    cleanup,
  };
};
