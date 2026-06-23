import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { VRMManager, type Emotion } from '../components/vrm/VRMManager';
import { fetchTTS, type Phoneme } from '../api/tts';

export type VoiceMode = 'silent' | 'browser' | 'tts';

interface VRMSyncState {
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  subtitle: string;
}

interface VRMSyncResult extends VRMSyncState {
  triggerSpeak: (text: string, emotion?: Emotion, duration?: number) => void;
  stopSpeaking: () => void;
}

const MOUTH_SHAPE_VALUES: Record<string, number> = {
  closed: 0.0,
  half: 0.4,
  open: 1.0,
};

export function useVRMSync(voiceMode: VoiceMode = 'silent'): VRMSyncResult {
  const [state, setState] = useState<VRMSyncState>({
    expression: 'neutral',
    mouthOpen: 0,
    isSpeaking: false,
    subtitle: '',
  });
  const mouthSimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const phonemeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceModeRef = useRef(voiceMode);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  useEffect(() => {
    return () => {
      if (mouthSimRef.current) clearInterval(mouthSimRef.current);
      if (phonemeTimerRef.current) clearInterval(phonemeTimerRef.current);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (mouthSimRef.current) {
      clearInterval(mouthSimRef.current);
      mouthSimRef.current = null;
    }
    if (phonemeTimerRef.current) {
      clearInterval(phonemeTimerRef.current);
      phonemeTimerRef.current = null;
    }
    soundRef.current?.stopAsync().catch(() => {});
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;

    VRMManager.stopSpeaking();
  }, []);

  const triggerSpeakFallback = useCallback((text: string, emotion: Emotion) => {
    setState((prev) => ({
      ...prev,
      isSpeaking: true,
      subtitle: text,
      expression: emotion || prev.expression,
    }));

    if (mouthSimRef.current) clearInterval(mouthSimRef.current);
    mouthSimRef.current = setInterval(() => {
      const value = Math.random() * 0.6 + 0.2;
      setState((prev) => ({ ...prev, mouthOpen: value }));
    }, 100);

    const autoDuration = Math.max(2000, text.length * 150);
    setTimeout(() => stopSpeaking(), autoDuration);
  }, [stopSpeaking]);

  // Web 平台：浏览器 TTS（免费）
  const playWithBrowserTTS = useCallback(async (text: string, emotion: Emotion) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[useVRMSync] Browser TTS not supported, using fallback');
      triggerSpeakFallback(text, emotion);
      return;
    }

    // 停止之前的语音
    window.speechSynthesis.cancel();

    setState((prev) => ({
      ...prev,
      isSpeaking: true,
      subtitle: text,
      expression: emotion || prev.expression,
    }));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // 口型模拟：在语音播放期间模拟口型变化
    const mouthInterval = setInterval(() => {
      const value = Math.random() * 0.6 + 0.2;
      setState((prev) => ({ ...prev, mouthOpen: value }));
    }, 100);

    utterance.onend = () => {
      clearInterval(mouthInterval);
      stopSpeaking();
    };

    utterance.onerror = (event) => {
      console.warn('[useVRMSync] Browser TTS error:', event);
      clearInterval(mouthInterval);
      stopSpeaking();
    };

    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking, triggerSpeakFallback]);

  // Native 平台：edge-tts 合成 + expo-av 播放
  const playWithPhonemes = useCallback(async (text: string, emotion: Emotion) => {
    try {
      const result = await fetchTTS(text);

      setState((prev) => ({
        ...prev,
        isSpeaking: true,
        subtitle: text,
        expression: emotion || prev.expression,
      }));

      const { sound } = await Audio.Sound.createAsync(
        { uri: result.audioUri },
        { shouldPlay: false },
      );
      soundRef.current = sound;

      // 等待音频准备就绪
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        throw new Error('Audio not loaded');
      }

      // 启动音素定时器（与音频播放同步）
      if (result.phonemes.length > 0) {
        const startTime = Date.now();
        phonemeTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          let targetMouth = 0;
          for (const p of result.phonemes) {
            if (elapsed >= p.start_ms && elapsed < p.end_ms) {
              targetMouth = MOUTH_SHAPE_VALUES[p.mouth_shape] ?? 0.5;
              break;
            }
          }
          setState((prev) => ({ ...prev, mouthOpen: targetMouth }));
        }, 50);
      } else {
        phonemeTimerRef.current = setInterval(() => {
          const value = Math.random() * 0.6 + 0.2;
          setState((prev) => ({ ...prev, mouthOpen: value }));
        }, 100);
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          stopSpeaking();
        }
      });

      // 开始播放音频
      await sound.playAsync();
    } catch (e) {
      console.warn('[useVRMSync] TTS failed, falling back:', e);
      triggerSpeakFallback(text, emotion);
    }
  }, [stopSpeaking, triggerSpeakFallback]);

  useEffect(() => {
    const handleSpeak = ({ text, emotion }: { text: string; emotion: Emotion }) => {
      const mode = voiceModeRef.current;
      if (mode === 'tts') {
        if (Platform.OS === 'web') {
          playWithBrowserTTS(text, emotion);
        } else {
          playWithPhonemes(text, emotion);
        }
      } else {
        triggerSpeakFallback(text, emotion);
      }
    };

    const handleEmotionChange = (emotion: Emotion) => {
      setState((prev) => ({ ...prev, expression: emotion }));
    };

    const handleStateChange = (vrmState: any) => {
      if (!vrmState.isSpeaking) {
        if (mouthSimRef.current) {
          clearInterval(mouthSimRef.current);
          mouthSimRef.current = null;
        }
        if (phonemeTimerRef.current) {
          clearInterval(phonemeTimerRef.current);
          phonemeTimerRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          isSpeaking: false,
          subtitle: '',
          mouthOpen: 0,
        }));
      }
    };

    VRMManager.on('speak', handleSpeak);
    VRMManager.on('emotionChange', handleEmotionChange);
    VRMManager.on('stateChange', handleStateChange);

    return () => {
      VRMManager.off('speak', handleSpeak);
      VRMManager.off('emotionChange', handleEmotionChange);
      VRMManager.off('stateChange', handleStateChange);
    };
  }, [playWithPhonemes, playWithBrowserTTS, triggerSpeakFallback]);

  const triggerSpeak = useCallback((text: string, emotion?: Emotion, duration?: number) => {
    VRMManager.speak(text, emotion || 'neutral', duration);
  }, []);

  return {
    ...state,
    triggerSpeak,
    stopSpeaking,
  };
}
