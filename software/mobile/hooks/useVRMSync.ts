import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { VRMManager, type Emotion } from '../components/vrm/VRMManager';
import type { Action } from '../components/vrm/VRMIdleAnim';
import { fetchTTS, type Phoneme } from '../api/tts';
import { estimateSpeechDuration } from '../utils/digitalHumanDriver';
import { getSubtitleCueForCharIndex, textToSubtitleCues, type SubtitleCue } from '../utils/textTimeline';

export type VoiceMode = 'silent' | 'browser' | 'tts';

export interface VoiceConfig {
  rate?: number;
  pitch?: number;
  browserVoiceUri?: string;
  ttsVoiceId?: string;
}

export interface StopSpeakingOptions {
  playQueued?: boolean;
}

interface VRMSyncState {
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  subtitle: string;
}

interface VRMSyncResult extends VRMSyncState {
  triggerSpeak: (
    text: string,
    emotion?: Emotion,
    duration?: number,
    action?: Action,
    actionDuration?: number,
  ) => void;
  stopSpeaking: (options?: StopSpeakingOptions) => void;
}

export interface VRMSyncOptions {
  speakerId?: string;
  voiceConfig?: VoiceConfig;
}

const MOUTH_SHAPE_VALUES: Record<string, number> = {
  closed: 0.0,
  half: 0.4,
  open: 1.0,
};

let audioModeReady = false;

interface BeginVisualSpeechOptions {
  subtitleProgression?: boolean;
}

async function ensureSpeechAudioMode() {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

export function useVRMSync(voiceMode: VoiceMode = 'silent', options: VRMSyncOptions = {}): VRMSyncResult {
  const [state, setState] = useState<VRMSyncState>({
    expression: 'neutral',
    mouthOpen: 0,
    isSpeaking: false,
    subtitle: '',
  });
  const mouthSimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const phonemeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subtitleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subtitleCuesRef = useRef<SubtitleCue[]>([]);
  const subtitleCueIndexRef = useRef(0);
  const fallbackStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRunIdRef = useRef(0);
  const ttsCacheRef = useRef<Map<string, { audioUri: string; durationMs: number; phonemes: Phoneme[] }>>(new Map());
  const voiceModeRef = useRef(voiceMode);
  const speakerIdRef = useRef(options.speakerId);
  const voiceConfigRef = useRef(options.voiceConfig);
  const activeSpeechRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { speakerIdRef.current = options.speakerId; }, [options.speakerId]);
  useEffect(() => { voiceConfigRef.current = options.voiceConfig; }, [options.voiceConfig]);

  const clearMouthTimers = useCallback(() => {
    if (mouthSimRef.current) {
      clearInterval(mouthSimRef.current);
      mouthSimRef.current = null;
    }
    if (phonemeTimerRef.current) {
      clearInterval(phonemeTimerRef.current);
      phonemeTimerRef.current = null;
    }
  }, []);

  const clearSubtitleTimer = useCallback(() => {
    if (subtitleTimerRef.current) {
      clearInterval(subtitleTimerRef.current);
      subtitleTimerRef.current = null;
    }
  }, []);

  const clearAutoStopTimer = useCallback(() => {
    if (fallbackStopTimerRef.current) {
      clearTimeout(fallbackStopTimerRef.current);
      fallbackStopTimerRef.current = null;
    }
  }, []);

  const cancelBrowserSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const disposeActiveSpeech = useCallback((options: { resetRun?: boolean } = {}) => {
    if (options.resetRun) {
      speechRunIdRef.current += 1;
    }
    clearMouthTimers();
    clearSubtitleTimer();
    subtitleCuesRef.current = [];
    subtitleCueIndexRef.current = 0;
    clearAutoStopTimer();
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      sound.stopAsync().catch(() => {});
      sound.unloadAsync().catch(() => {});
    }
    cancelBrowserSpeech();
  }, [cancelBrowserSpeech, clearAutoStopTimer, clearMouthTimers, clearSubtitleTimer]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const shouldStopManager = activeSpeechRef.current
        || soundRef.current !== null
        || mouthSimRef.current !== null
        || phonemeTimerRef.current !== null
        || fallbackStopTimerRef.current !== null
        || subtitleTimerRef.current !== null;
      activeSpeechRef.current = false;
      disposeActiveSpeech({ resetRun: true });
      if (shouldStopManager) {
        VRMManager.stopSpeaking({ playQueued: false });
      }
    };
  }, [disposeActiveSpeech]);

  const stopSpeaking = useCallback((options: StopSpeakingOptions = {}) => {
    activeSpeechRef.current = false;
    disposeActiveSpeech({ resetRun: true });
    VRMManager.stopSpeaking(options);
  }, [disposeActiveSpeech]);

  const startMouthSimulation = useCallback(() => {
    clearMouthTimers();
    mouthSimRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const value = Math.random() * 0.6 + 0.2;
      setState((prev) => ({ ...prev, mouthOpen: value }));
    }, 100);
  }, [clearMouthTimers]);

  const prepareInitialSubtitle = useCallback((text: string, durationMs: number) => {
    const cues = textToSubtitleCues(text, durationMs);
    subtitleCuesRef.current = cues;
    subtitleCueIndexRef.current = 0;
    return cues[0]?.text ?? '';
  }, []);

  const startSubtitleProgression = useCallback((text: string, durationMs: number) => {
    clearSubtitleTimer();
    const cues = textToSubtitleCues(text, durationMs);
    subtitleCuesRef.current = cues;
    subtitleCueIndexRef.current = 0;
    if (cues.length === 0) return '';

    let currentIndex = 0;
    const startedAt = Date.now();
    subtitleTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - startedAt;
      let nextIndex = currentIndex;
      for (let i = cues.length - 1; i >= 0; i--) {
        if (cues[i].timeMs <= elapsed) {
          nextIndex = i;
          break;
        }
      }
      if (nextIndex > subtitleCueIndexRef.current) {
        currentIndex = nextIndex;
        subtitleCueIndexRef.current = nextIndex;
        setState((prev) => (
          prev.subtitle === cues[nextIndex].text
            ? prev
            : { ...prev, subtitle: cues[nextIndex].text }
        ));
      }
    }, 120);

    return cues[0].text;
  }, [clearSubtitleTimer]);

  const syncSubtitleToSpeechBoundary = useCallback((charIndex: number) => {
    if (!mountedRef.current) return;

    const cue = getSubtitleCueForCharIndex(subtitleCuesRef.current, charIndex);
    if (!cue) return;
    const cueIndex = subtitleCuesRef.current.indexOf(cue);
    if (cueIndex < subtitleCueIndexRef.current) return;

    subtitleCueIndexRef.current = cueIndex;
    setState((prev) => (
      prev.subtitle === cue.text ? prev : { ...prev, subtitle: cue.text }
    ));
  }, []);

  const beginVisualSpeech = useCallback((
    text: string,
    emotion: Emotion,
    durationMs: number,
    options: BeginVisualSpeechOptions = {},
  ) => {
    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    activeSpeechRef.current = true;
    const initialSubtitle = options.subtitleProgression === false
      ? prepareInitialSubtitle(text, durationMs)
      : startSubtitleProgression(text, durationMs);
    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        isSpeaking: true,
        subtitle: initialSubtitle,
        expression: emotion || prev.expression,
      }));
    }
    startMouthSimulation();
    return runId;
  }, [prepareInitialSubtitle, startMouthSimulation, startSubtitleProgression]);

  const scheduleVisualStop = useCallback((durationMs: number) => {
    clearAutoStopTimer();
    fallbackStopTimerRef.current = setTimeout(() => {
      fallbackStopTimerRef.current = null;
      stopSpeaking();
    }, durationMs);
  }, [clearAutoStopTimer, stopSpeaking]);

  const triggerSpeakFallback = useCallback((text: string, emotion: Emotion) => {
    const autoDuration = estimateSpeechDuration(text);
    beginVisualSpeech(text, emotion, autoDuration);
    scheduleVisualStop(autoDuration);
  }, [beginVisualSpeech, scheduleVisualStop]);

  // Web 平台：浏览器 TTS（免费）
  const playWithBrowserTTS = useCallback(async (text: string, emotion: Emotion) => {
    const estimatedDuration = estimateSpeechDuration(text);
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[useVRMSync] Browser TTS not supported, using fallback');
      triggerSpeakFallback(text, emotion);
      return;
    }

    // 停止之前的语音
    window.speechSynthesis.cancel();

    const runId = beginVisualSpeech(text, emotion, estimatedDuration);
    scheduleVisualStop(estimatedDuration + 1000);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    const cfg = voiceConfigRef.current;
    utterance.rate = cfg?.rate ?? 1.0;
    utterance.pitch = cfg?.pitch ?? 1.0;
    if (cfg?.browserVoiceUri && typeof window !== 'undefined') {
      const voices = window.speechSynthesis.getVoices();
      const selected = voices.find((v) => v.voiceURI === cfg.browserVoiceUri);
      if (selected) utterance.voice = selected;
    }

    utterance.onboundary = (event) => {
      if (speechRunIdRef.current !== runId) return;
      if (typeof event.charIndex === 'number' && event.charIndex >= 0) {
        syncSubtitleToSpeechBoundary(event.charIndex);
      }
    };

    utterance.onend = () => {
      if (speechRunIdRef.current !== runId) return;
      // 先显示完整文本，再延迟停止，避免字幕提前消失
      setState((prev) => ({ ...prev, subtitle: text }));
      setTimeout(() => stopSpeaking(), 100);
    };

    utterance.onerror = (event) => {
      if (speechRunIdRef.current !== runId) return;
      console.warn('[useVRMSync] Browser TTS error:', event);
      stopSpeaking();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (speechRunIdRef.current !== runId) return;
      console.warn('[useVRMSync] Browser TTS failed:', e);
      stopSpeaking();
    }
  }, [beginVisualSpeech, scheduleVisualStop, stopSpeaking, syncSubtitleToSpeechBoundary, triggerSpeakFallback]);

  const TTS_TIMEOUT_MS = 3500;
  const MAX_TTS_CACHE = 20;

  // Native/Web：edge-tts 合成 + expo-av 播放
  const playWithPhonemes = useCallback(async (text: string, emotion: Emotion) => {
    const estimatedDuration = estimateSpeechDuration(text);
    const runId = beginVisualSpeech(text, emotion, estimatedDuration, { subtitleProgression: false });
    scheduleVisualStop(estimatedDuration + 4000);
    try {
      const voiceId = voiceConfigRef.current?.ttsVoiceId ?? 'default';
      const cacheKey = `${text}::${voiceId}`;
      let result = ttsCacheRef.current.get(cacheKey);

      if (!result) {
        result = await Promise.race([
          fetchTTS(text, voiceConfigRef.current?.ttsVoiceId),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('TTS timeout')), TTS_TIMEOUT_MS);
          }),
        ]);
        ttsCacheRef.current.set(cacheKey, result);
        if (ttsCacheRef.current.size > MAX_TTS_CACHE) {
          const firstKey = ttsCacheRef.current.keys().next().value;
          if (firstKey) ttsCacheRef.current.delete(firstKey);
        }
      }

      if (speechRunIdRef.current !== runId) return;
      await ensureSpeechAudioMode();
      if (speechRunIdRef.current !== runId) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: result.audioUri },
        { shouldPlay: false },
      );
      if (speechRunIdRef.current !== runId) {
        sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;

      // 等待音频准备就绪
      const status = await sound.getStatusAsync();
      if (speechRunIdRef.current !== runId) {
        sound.unloadAsync().catch(() => {});
        return;
      }
      if (!status.isLoaded) {
        throw new Error('Audio not loaded');
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (speechRunIdRef.current === runId && status.isLoaded && status.didJustFinish) {
          // 先显示完整文本，再延迟停止，避免字幕提前消失
          setState((prev) => ({ ...prev, subtitle: text }));
          setTimeout(() => stopSpeaking(), 100);
        }
      });

      // 开始播放音频
      await sound.playAsync();
      if (speechRunIdRef.current !== runId) {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
        return;
      }

      const actualDuration = result.durationMs > 0 ? result.durationMs : estimatedDuration;
      // 用实际音频时长同步表情/动作时间轴
      VRMManager.resyncTimeline(actualDuration);
      const initialSubtitle = startSubtitleProgression(text, actualDuration);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, subtitle: initialSubtitle }));
      }

      clearMouthTimers();
      if (result.phonemes.length > 0) {
        const startTime = Date.now();
        phonemeTimerRef.current = setInterval(() => {
          if (!mountedRef.current) return;
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
          if (!mountedRef.current) return;
          const value = Math.random() * 0.6 + 0.2;
          setState((prev) => ({ ...prev, mouthOpen: value }));
        }, 100);
      }

      scheduleVisualStop(actualDuration + 1500);
    } catch (e) {
      if (speechRunIdRef.current !== runId) return;
      console.warn('[useVRMSync] TTS failed, falling back:', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
        playWithBrowserTTS(text, emotion);
      } else {
        triggerSpeakFallback(text, emotion);
      }
    }
  }, [beginVisualSpeech, clearMouthTimers, scheduleVisualStop, startSubtitleProgression, stopSpeaking]);

  useEffect(() => {
    const handleSpeak = ({ text, emotion, targetId }: { text: string; emotion: Emotion; targetId?: string }) => {
      if (targetId && targetId !== speakerIdRef.current) return;

      const mode = voiceModeRef.current;
      if (mode === 'silent') {
        triggerSpeakFallback(text, emotion);
      } else if (mode === 'browser') {
        playWithBrowserTTS(text, emotion);
      } else if (mode === 'tts') {
        playWithPhonemes(text, emotion);
      } else {
        if (Platform.OS === 'web') {
          playWithBrowserTTS(text, emotion);
        } else {
          playWithPhonemes(text, emotion);
        }
      }
    };

    const handleEmotionChange = (emotion: Emotion) => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, expression: emotion }));
    };

    const handleStateChange = (vrmState: any) => {
      if (!mountedRef.current) return;
      if (!vrmState.isSpeaking) {
        activeSpeechRef.current = false;
        disposeActiveSpeech();
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
  }, [disposeActiveSpeech, playWithPhonemes, playWithBrowserTTS, triggerSpeakFallback]);

  const triggerSpeak = useCallback((
    text: string,
    emotion?: Emotion,
    duration?: number,
    action?: Action,
    actionDuration?: number,
  ) => {
    VRMManager.speak(text, emotion || 'neutral', duration, action, actionDuration, speakerIdRef.current);
  }, []);

  return {
    ...state,
    triggerSpeak,
    stopSpeaking,
  };
}
