import { useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';

export interface Phoneme {
  char: string;
  start_ms: number;
  end_ms: number;
  mouth_shape: 'closed' | 'half' | 'open';
}

export interface LipSyncProps {
  audioData?: Float32Array | null;
  phonemes?: Phoneme[] | null;
  currentTimeMs?: number;
  currentTimeMsRef?: MutableRefObject<number>;
  onParameterChange?: (paramId: string, value: number) => void;
  smoothing?: number;
  enabled?: boolean;
}

const PARAM_MOUTH_OPEN_Y = 'ParamMouthOpenY';
const PARAM_MOUTH_FORM = 'ParamMouthForm';
const PARAM_ANGLE_Z = 'ParamAngleZ';

const MOUTH_SHAPE_VALUES: Record<string, number> = {
  closed: 0.0,
  half: 0.4,
  open: 1.0,
};

function getPhonemeMouth(ms: number, phonemeData: Phoneme[]): number {
  for (const p of phonemeData) {
    if (ms >= p.start_ms && ms < p.end_ms) {
      return MOUTH_SHAPE_VALUES[p.mouth_shape] ?? 0.5;
    }
  }
  return 0;
}

function processAudioData(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 8);
}

const LipSync: React.FC<LipSyncProps> = ({
  audioData,
  phonemes,
  currentTimeMs = 0,
  currentTimeMsRef: externalCurrentTimeMsRef,
  onParameterChange,
  smoothing = 0.3,
  enabled = true,
}) => {
  const prevMouthRef = useRef(0);
  const prevAngleRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const phonemesRef = useRef<Phoneme[] | null | undefined>(null);
  const audioDataRef = useRef<Float32Array | null | undefined>(null);
  const currentTimeMsRef = useRef(currentTimeMs);
  const smoothingRef = useRef(smoothing);
  const enabledRef = useRef(enabled);
  const onParameterChangeRef = useRef(onParameterChange);

  // Sync all props to refs
  useEffect(() => { phonemesRef.current = phonemes; }, [phonemes]);
  useEffect(() => { audioDataRef.current = audioData; }, [audioData]);
  useEffect(() => { currentTimeMsRef.current = currentTimeMs; }, [currentTimeMs]);
  useEffect(() => { smoothingRef.current = smoothing; }, [smoothing]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onParameterChangeRef.current = onParameterChange; }, [onParameterChange]);

  const animate = useCallback(() => {
    if (!mountedRef.current) return;

    if (!enabledRef.current) {
      prevMouthRef.current *= 0.7;
      onParameterChangeRef.current?.(PARAM_MOUTH_OPEN_Y, prevMouthRef.current);
      if (prevMouthRef.current < 0.01) {
        prevMouthRef.current = 0;
        onParameterChangeRef.current?.(PARAM_MOUTH_OPEN_Y, 0);
        onParameterChangeRef.current?.(PARAM_ANGLE_Z, 0);
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const ms = externalCurrentTimeMsRef?.current ?? currentTimeMsRef.current;
    let targetMouth = 0;

    if (phonemesRef.current && phonemesRef.current.length > 0) {
      targetMouth = ms > 0
        ? getPhonemeMouth(ms, phonemesRef.current)
        : getPhonemeMouth(elapsed, phonemesRef.current);
      if (targetMouth === 0) {
        const cycle = (elapsed % 300) / 300;
        targetMouth = cycle < 0.3 ? cycle / 0.3 : 1 - (cycle - 0.3) / 0.7;
        targetMouth = Math.max(0, Math.min(1, targetMouth)) * 0.6;
      }
    } else if (audioDataRef.current) {
      targetMouth = processAudioData(audioDataRef.current);
    } else {
      const cycle = (elapsed % 300) / 300;
      targetMouth = cycle < 0.3 ? cycle / 0.3 : 1 - (cycle - 0.3) / 0.7;
      targetMouth = Math.max(0, Math.min(1, targetMouth)) * 0.6;
    }

    const s = smoothingRef.current;
    const smoothedMouth = prevMouthRef.current * s + targetMouth * (1 - s);
    prevMouthRef.current = smoothedMouth;

    onParameterChangeRef.current?.(PARAM_MOUTH_OPEN_Y, smoothedMouth);
    onParameterChangeRef.current?.(PARAM_MOUTH_FORM, smoothedMouth * 0.3);

    const angleTarget = Math.sin(Date.now() / 400) * 2;
    const smoothedAngle = prevAngleRef.current * 0.85 + angleTarget * 0.15;
    prevAngleRef.current = smoothedAngle;
    onParameterChangeRef.current?.(PARAM_ANGLE_Z, smoothedAngle);

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Start/stop rAF based on enabled state
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      startTimeRef.current = Date.now();
      prevMouthRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      mountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [enabled, animate]);

  return null;
};

export default LipSync;
