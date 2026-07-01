import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { fetchTTS } from '@/api/tts';

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

/**
 * TTS 音频播放 Hook
 * 支持：文本转语音、音频播放、进度控制
 */
export const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  /**
   * 生成 TTS 音频
   */
  const generateTTS = useCallback(async (options: TTSOptions): Promise<string | null> => {
    try {
      const result = await fetchTTS(options.text, options.voice);
      setAudioUrl(result.audioUri);
      setDuration(result.durationMs);
      return result.audioUri;
    } catch (error) {
      console.error('TTS generation failed:', error);
      return null;
    }
  }, []);

  /**
   * 播放音频
   */
  const play = useCallback(async (uri?: string) => {
    try {
      const audioUri = uri || audioUrl;
      if (!audioUri) {
        throw new Error('No audio file to play');
      }

      // 配置音频模式
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // 卸载之前的音频
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // 加载新音频
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
      setSound(sound);
      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  /**
   * 暂停播放
   */
  const pause = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPaused(true);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Pause failed:', error);
    }
  }, []);

  /**
   * 恢复播放
   */
  const resume = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPaused(false);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Resume failed:', error);
    }
  }, []);

  /**
   * 停止播放
   */
  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }
      setIsPlaying(false);
      setIsPaused(false);
      setPosition(0);
    } catch (error) {
      console.error('Stop failed:', error);
    }
  }, []);

  /**
   * 跳转到指定位置
   */
  const seekTo = useCallback(async (positionMillis: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(positionMillis);
        setPosition(positionMillis);
      }
    } catch (error) {
      console.error('Seek failed:', error);
    }
  }, []);

  /**
   * 播放状态更新回调
   */
  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setIsPaused(false);
        setPosition(0);
      }
    }
  }, []);

  /**
   * 清理资源
   */
  const cleanup = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      if (audioUrl) {
        await FileSystem.deleteAsync(audioUrl, { idempotent: true });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }, [audioUrl]);

  return {
    isPlaying,
    isPaused,
    duration,
    position,
    audioUrl,
    generateTTS,
    play,
    pause,
    resume,
    stop,
    seekTo,
    cleanup,
  };
};
