import { useCallback, useEffect, useRef, useState } from 'react';
import { VRMManager } from '@/components/vrm/VRMManager';
import type { Emotion, PageContext } from '@/components/vrm/VRMTypes';
import { ExpressionPlayer, textToTimeline, type Action } from '@/utils/textTimeline';
import { estimateSpeechDuration, type HeadRotation } from '@/utils/digitalHumanDriver';
import { useVRMSync, type StopSpeakingOptions, type VoiceMode, type VoiceConfig } from './useVRMSync';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';

let driverCounter = 0;
export interface SpeakOptions {
  emotion?: Emotion;
  durationMs?: number;
  action?: Action;
  actionDurationMs?: number;
}

export interface DigitalHumanDriverOptions {
  speakerId?: string;
  voiceConfig?: VoiceConfig;
}

export interface DigitalHumanDriver {
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  speechText: string;
  subtitle: string;
  action: Action;
  actionDurationMs: number;
  headRotation: HeadRotation;
  speak: (text: string, options?: SpeakOptions) => void;
  prefetchSpeech: (text: string) => Promise<void>;
  stop: (options?: StopSpeakingOptions) => void;
  setExpression: (expression: Emotion) => void;
  playAction: (action: Action, durationMs?: number) => void;
  setPageContext: (context: PageContext, data?: Record<string, any>) => void;
  activate: () => void;
}

const NEUTRAL_HEAD_ROTATION: HeadRotation = { x: 0, y: 0 };
const ACTION_RESTART_DELAY_MS = 40;

function getExpressionForAction(expression: Emotion, action: Action): Emotion {
  switch (action) {
    case 'thinking':
      return 'thinking';
    case 'wave':
    case 'showcase':
    case 'nod':
      return 'happy';
    case 'listen':
      return 'relaxed';
    case 'waiting1':
    case 'waiting2':
    case 'waiting3':
      return 'neutral';
    case 'explain':
      return expression === 'neutral' ? 'relaxed' : expression;
    default:
      return expression;
  }
}

export function useDigitalHumanDriver(
  voiceMode: VoiceMode = DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
  options: DigitalHumanDriverOptions = {},
) {
  const speakerIdRef = useRef(options.speakerId ?? `driver-${++driverCounter}`);
  const {
    expression: syncExpression,
    mouthOpen,
    isSpeaking,
    speechText,
    subtitle,
    triggerSpeak,
    stopSpeaking,
    prefetchSpeech,
  } = useVRMSync(voiceMode, { speakerId: speakerIdRef.current, voiceConfig: options.voiceConfig });
  const [timelineExpression, setTimelineExpression] = useState<Emotion>('neutral');
  const [action, setAction] = useState<Action>('none');
  const [actionDurationMs, setActionDurationMs] = useState(800);
  const playerRef = useRef<ExpressionPlayer | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentActionRef = useRef<Action>('none');
  const currentActionDurationRef = useRef(800);
  const currentSpeakTextRef = useRef<string>('');
  const currentForcedActionRef = useRef<Action | undefined>(undefined);
  const currentForcedActionDurationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const id = speakerIdRef.current;
    VRMManager.setActiveSpeakerId(id);
    return () => {
      // 只有当前活动 speaker 是自己时才清空，避免后 mount 的组件误清前者的状态
      if (VRMManager.getActiveSpeakerId?.() === id) {
        VRMManager.setActiveSpeakerId(null);
      }
    };
  }, []);

  useEffect(() => {
    speakerIdRef.current = options.speakerId ?? speakerIdRef.current;
  }, [options.speakerId]);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const clearActionRestartTimer = useCallback(() => {
    if (actionRestartTimerRef.current) {
      clearTimeout(actionRestartTimerRef.current);
      actionRestartTimerRef.current = null;
    }
  }, []);

  const restartAction = useCallback((nextAction: Action, durationMs: number) => {
    currentActionDurationRef.current = durationMs;
    setActionDurationMs(durationMs);
    if (nextAction === currentActionRef.current) {
      return;
    }
    clearActionRestartTimer();
    if (nextAction === 'none') {
      currentActionRef.current = 'none';
      setAction('none');
      return;
    }
    currentActionRef.current = nextAction;
    setAction('none');
    actionRestartTimerRef.current = setTimeout(() => {
      actionRestartTimerRef.current = null;
      setActionDurationMs(currentActionDurationRef.current);
      setAction(nextAction);
    }, ACTION_RESTART_DELAY_MS);
  }, [clearActionRestartTimer]);

  const resetTimelineState = useCallback(() => {
    clearActionRestartTimer();
    currentActionRef.current = 'none';
    currentActionDurationRef.current = 800;
    playerRef.current?.stop();
    setTimelineExpression('neutral');
    setAction('none');
    setActionDurationMs(800);
    currentSpeakTextRef.current = '';
    currentForcedActionRef.current = undefined;
    currentForcedActionDurationRef.current = undefined;
  }, [clearActionRestartTimer]);

  const startTimeline = useCallback((
    text: string,
    durationMs: number,
    forcedAction?: Action,
    forcedActionDurationMs?: number,
  ) => {
    currentSpeakTextRef.current = text;
    currentForcedActionRef.current = forcedAction;
    currentForcedActionDurationRef.current = forcedActionDurationMs;
    const timeline = textToTimeline(text, durationMs);
    if (forcedAction && forcedAction !== 'none') {
      for (let index = 0; index < timeline.length - 1; index += 1) {
        timeline[index] = {
          ...timeline[index],
          action: forcedAction,
          durationMs: forcedActionDurationMs ?? timeline[index].durationMs ?? 1200,
        };
      }
    }
    clearResetTimer();

    playerRef.current?.play(timeline, (expression, nextAction, nextDurationMs) => {
      setTimelineExpression(getExpressionForAction(expression, nextAction || 'none'));
      restartAction(nextAction || 'none', nextDurationMs);
    });

    resetTimerRef.current = setTimeout(() => {
      resetTimelineState();
    }, durationMs);
  }, [clearResetTimer, resetTimelineState, restartAction]);

  useEffect(() => {
    playerRef.current = new ExpressionPlayer();
    return () => {
      clearResetTimer();
      clearActionRestartTimer();
      playerRef.current?.stop();
    };
  }, [clearActionRestartTimer, clearResetTimer]);

  useEffect(() => {
    const handleManagerSpeak = ({
      text,
      action: managerAction,
      actionDuration,
      targetId,
    }: {
      text: string;
      duration: number;
      action?: Action;
      actionDuration?: number;
      targetId?: string;
    }) => {
      if (targetId && targetId !== speakerIdRef.current) return;
      currentSpeakTextRef.current = text;
      currentForcedActionRef.current = managerAction;
      currentForcedActionDurationRef.current = actionDuration;
    };

    VRMManager.on('speak', handleManagerSpeak);
    return () => {
      VRMManager.off('speak', handleManagerSpeak);
    };
  }, []);

  useEffect(() => {
    const handleManagerStateChange = (vrmState: { isSpeaking?: boolean }) => {
      if (!vrmState.isSpeaking) {
        resetTimelineState();
      }
    };

    VRMManager.on('stateChange', handleManagerStateChange);
    return () => {
      VRMManager.off('stateChange', handleManagerStateChange);
    };
  }, [resetTimelineState]);

  // 监听 resync 事件，用实际音频时长重新同步表情/动作时间轴
  useEffect(() => {
    const handleResync = ({
      durationMs,
      targetId,
    }: {
      durationMs: number;
      targetId?: string;
    }) => {
      if (targetId && targetId !== speakerIdRef.current) return;
      // 用实际时长重启时间轴，与音频播放起点对齐
      const currentText = currentSpeakTextRef.current;
      if (currentText) {
        startTimeline(
          currentText,
          durationMs,
          currentForcedActionRef.current,
          currentForcedActionDurationRef.current,
        );
      }
    };
    VRMManager.on('resync', handleResync);
    return () => {
      VRMManager.off('resync', handleResync);
    };
  }, [startTimeline]);

  const speak = useCallback((text: string, options?: SpeakOptions) => {
    const durationMs = options?.durationMs ?? estimateSpeechDuration(text);
    const first = textToTimeline(text, durationMs)[0];
    triggerSpeak(
      text,
      options?.emotion || first?.expression || 'neutral',
      durationMs,
      options?.action,
      options?.actionDurationMs,
    );
  }, [triggerSpeak]);

  const stop = useCallback((options?: StopSpeakingOptions) => {
    clearResetTimer();
    resetTimelineState();
    stopSpeaking(options);
  }, [clearResetTimer, resetTimelineState, stopSpeaking]);

  const setExpression = useCallback((expression: Emotion) => {
    setTimelineExpression(expression);
    VRMManager.setEmotion(expression);
  }, []);

  const playAction = useCallback((nextAction: Action, durationMs: number = 800) => {
    restartAction(nextAction, durationMs);
  }, [restartAction]);

  const setPageContext = useCallback((context: PageContext, data?: Record<string, any>) => {
    VRMManager.setPageContext(context, data);
  }, []);

  const activate = useCallback(() => {
    VRMManager.setActiveSpeakerId(speakerIdRef.current);
  }, []);

  return {
    expression: timelineExpression !== 'neutral' ? timelineExpression : syncExpression,
    mouthOpen,
    isSpeaking,
    speechText,
    subtitle,
    action,
    actionDurationMs,
    headRotation: NEUTRAL_HEAD_ROTATION,
    speak,
    prefetchSpeech,
    stop,
    setExpression,
    playAction,
    setPageContext,
    activate,
  };
}
