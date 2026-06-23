import { useCallback, useEffect, useRef, useState } from 'react';
import { VRMManager } from '@/components/vrm/VRMManager';
import type { Emotion, PageContext } from '@/components/vrm/VRMTypes';
import { ExpressionPlayer, textToTimeline, type Action } from '@/utils/textTimeline';
import { computeLookUpHeadRotation, estimateSpeechDuration, type HeadRotation } from '@/utils/digitalHumanDriver';
import { useVRMSync, type VoiceMode } from './useVRMSync';

export interface SpeakOptions {
  emotion?: Emotion;
  durationMs?: number;
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
  stop: () => void;
  setExpression: (expression: Emotion) => void;
  playAction: (action: Action, durationMs?: number) => void;
  setPageContext: (context: PageContext, data?: Record<string, any>) => void;
}

export function useDigitalHumanDriver(voiceMode: VoiceMode = 'tts'): DigitalHumanDriver {
  const {
    expression: syncExpression,
    mouthOpen,
    isSpeaking,
    subtitle,
    triggerSpeak,
    stopSpeaking,
  } = useVRMSync(voiceMode);

  const [timelineExpression, setTimelineExpression] = useState<Emotion>('neutral');
  const [action, setAction] = useState<Action>('none');
  const [actionDurationMs, setActionDurationMs] = useState(800);
  const [headRotation, setHeadRotation] = useState<HeadRotation>({ x: 0, y: 0 });
  const playerRef = useRef<ExpressionPlayer | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const resetTimelineState = useCallback(() => {
    playerRef.current?.stop();
    setTimelineExpression('neutral');
    setAction('none');
    setActionDurationMs(800);
    setHeadRotation({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    playerRef.current = new ExpressionPlayer();
    return () => {
      clearResetTimer();
      playerRef.current?.stop();
    };
  }, [clearResetTimer]);

  useEffect(() => {
    if (action !== 'lookUp') {
      setHeadRotation({ x: 0, y: 0 });
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setHeadRotation(computeLookUpHeadRotation(elapsed, actionDurationMs));
      if (elapsed >= actionDurationMs) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [action, actionDurationMs]);

  const speak = useCallback((text: string, options?: SpeakOptions) => {
    const durationMs = options?.durationMs ?? estimateSpeechDuration(text);
    const timeline = textToTimeline(text, durationMs);
    const first = timeline[0];

    clearResetTimer();

    if (first) {
      setTimelineExpression(first.expression);
      setAction(first.action || 'none');
      setActionDurationMs(first.durationMs ?? 800);
    }

    playerRef.current?.play(timeline, (expression, nextAction, nextDurationMs) => {
      setTimelineExpression(expression);
      setAction(nextAction || 'none');
      setActionDurationMs(nextDurationMs);
    });

    triggerSpeak(text, options?.emotion || first?.expression || 'neutral', durationMs);

    resetTimerRef.current = setTimeout(() => {
      resetTimelineState();
    }, durationMs);
  }, [clearResetTimer, resetTimelineState, triggerSpeak]);

  const stop = useCallback(() => {
    clearResetTimer();
    resetTimelineState();
    stopSpeaking();
  }, [clearResetTimer, resetTimelineState, stopSpeaking]);

  const setExpression = useCallback((expression: Emotion) => {
    setTimelineExpression(expression);
    VRMManager.setEmotion(expression);
  }, []);

  const playAction = useCallback((nextAction: Action, durationMs: number = 800) => {
    setAction(nextAction);
    setActionDurationMs(durationMs);
  }, []);

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
    headRotation,
    speak,
    stop,
    setExpression,
    playAction,
    setPageContext,
  };
}
