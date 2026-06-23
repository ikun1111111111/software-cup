import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import { API_BASE_URL } from '@/api/config';

export interface VoiceInputOptions {
  language?: string;
  maxDuration?: number;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 语音输入 Hook
 * 支持：录音、语音识别、实时转写
 */
export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  /**
   * 请求麦克风权限
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
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // 配置录音参数
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        options?.maxDuration || 30000, // 默认30秒
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Start recording failed:', error);
      Alert.alert('录音失败', '无法启动录音，请检查麦克风权限');
      options?.onError?.(error as Error);
    }
  }, [requestPermissions]);

  /**
   * 停止录音并转写
   */
  const stopRecording = useCallback(async (options?: VoiceInputOptions) => {
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

      // 调用后端 ASR 服务
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('language', options?.language || 'zh-CN');

      const response = await fetch(`${API_BASE_URL}/asr/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`ASR API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';
      
      setTranscript(text);
      options?.onTranscript?.(text);
    } catch (error) {
      console.error('Stop recording failed:', error);
      Alert.alert('转写失败', '语音识别失败，请重试');
      options?.onError?.(error as Error);
    } finally {
      setIsProcessing(false);
      recordingRef.current = null;
    }
  }, []);

  /**
   * 取消录音
   */
  const cancelRecording = useCallback(async () => {
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
  }, []);

  /**
   * 清理资源
   */
  const cleanup = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }, []);

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
