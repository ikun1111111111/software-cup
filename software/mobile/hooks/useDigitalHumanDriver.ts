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
  subtitle: string;
  action: Action;
  actionDurationMs: number;
  headRotation: HeadRotation;
  speak: (text: string, options?: SpeakOptions) => void;
  stop: (options?: StopSpeakingOptions) => void;
  setExpression: (expression: Emotion) => void;
  playAction: (action: Action, durationMs?: number) => void;
  setPageContext: (context: PageContext, data?: Record<string, any>) => void;
}

const NEUTRAL_HEAD_ROTATION: HeadRotation = { x: 0, y: 0 };
const ACTION_RESTART_DELAY_MS = 40;

export function useDigitalHumanDriver(
  voiceMode: VoiceMode = DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
  options: DigitalHumanDriverOptions = {},
) {
  const speakerIdRef = useRef(options.speakerId ?? `driver-${++driverCounter}`);
  const {
    expression: syncExpression,
    mouthOpen,
    isSpeaking,
    subtitle,
    triggerSpeak,
    stopSpeaking,
  } = useVRMSync(voiceMode, { speakerId: speakerIdRef.current, voiceConfig: options.voiceConfig });
  const [timelineExpression, setTimelineExpression] = useState<Emotion>('neutral');
  const [action, setAction] = useState<Action>('none');
  const [actionDurationMs, setActionDurationMs] = useState(800);
  const playerRef = useRef<ExpressionPlayer | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    clearActionRestartTimer();
    setActionDurationMs(durationMs);
    if (nextAction === 'none') {
      setAction('none');
      return;
    }
    setAction('none');
    actionRestartTimerRef.current = setTimeout(() => {
      actionRestartTimerRef.current = null;
      setActionDurationMs(durationMs);
      setAction(nextAction);
    }, ACTION_RESTART_DELAY_MS);
  }, [clearActionRestartTimer]);

  const resetTimelineState = useCallback(() => {
    clearActionRestartTimer();
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
    if (forcedAction && forcedAction !== 'none' && timeline[0]) {
      timeline[0] = {
        ...timeline[0],
        action: forcedAction,
        durationMs: forcedActionDurationMs ?? timeline[0].durationMs ?? 1200,
      };
    }
    const first = timeline[0];

    clearResetTimer();

    if (first) {
      setTimelineExpression(first.expression);
      restartAction(first.action || 'none', first.durationMs ?? 800);
    }

    playerRef.current?.play(timeline, (expression, nextAction, nextDurationMs) => {
      setTimelineExpression(expression);
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
      duration,
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
      startTimeline(text, duration, managerAction, actionDuration);
    };

    VRMManager.on('speak', handleManagerSpeak);
    return () => {
      VRMManager.off('speak', handleManagerSpeak);
    };
  }, [startTimeline]);

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
    const handleResync = ({ durationMs }: { durationMs: number }) => {
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

  return {
    expression: timelineExpression !== 'neutral' ? timelineExpression : syncExpression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action,
    actionDurationMs,
    headRotation: NEUTRAL_HEAD_ROTATION,
    speak,
    stop,
    setExpression,
    playAction,
    setPageContext,
  };
}
