import { useEffect, useRef } from 'react';

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

const LipSync: React.FC<LipSyncProps> = ({
  audioData,
  phonemes,
  currentTimeMs = 0,
  onParameterChange,
  smoothing = 0.3,
  enabled = true,
}) => {
  const prevMouthRef = useRef(0);
  const prevAngleRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>();
  const phonemesRef = useRef<Phoneme[] | null | undefined>(null);
  const audioDataRef = useRef<Float32Array | null | undefined>(null);
  const currentTimeMsRef = useRef(currentTimeMs);
  const smoothingRef = useRef(smoothing);
  const enabledRef = useRef(enabled);

  // Sync all props to refs (used inside rAF loop)
  useEffect(() => { phonemesRef.current = phonemes; }, [phonemes]);
  useEffect(() => { audioDataRef.current = audioData; }, [audioData]);
  useEffect(() => { currentTimeMsRef.current = currentTimeMs; }, [currentTimeMs]);
  useEffect(() => { smoothingRef.current = smoothing; }, [smoothing]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const getPhonemeMouth = (ms: number, phonemeData: Phoneme[]): number => {
    for (const p of phonemeData) {
      if (ms >= p.start_ms && ms < p.end_ms) {
        return MOUTH_SHAPE_VALUES[p.mouth_shape] ?? 0.5;
      }
    }
    return 0;
  };

  const processAudioData = (data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 8);
  };

  // Single rAF loop that starts on mount and runs continuously
  useEffect(() => {
    if (enabledRef.current) {
      startTimeRef.current = Date.now();
      prevMouthRef.current = 0;
    }

    const animate = () => {
      if (!enabledRef.current) {
        // Decay to closed
        prevMouthRef.current *= 0.7;
        onParameterChange?.(PARAM_MOUTH_OPEN_Y, prevMouthRef.current);
        if (prevMouthRef.current < 0.01) {
          prevMouthRef.current = 0;
          onParameterChange?.(PARAM_MOUTH_OPEN_Y, 0);
          onParameterChange?.(PARAM_ANGLE_Z, 0);
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const ms = currentTimeMsRef.current;
      let targetMouth = 0;

      if (phonemesRef.current && phonemesRef.current.length > 0) {
        // Try matching phonemes with audio time; fallback to elapsed time
        targetMouth = ms > 0
          ? getPhonemeMouth(ms, phonemesRef.current)
          : getPhonemeMouth(elapsed, phonemesRef.current);
        // If no phoneme matched (out of range or time=0), simulate
        if (targetMouth === 0) {
          const cycle = (elapsed % 300) / 300;
          targetMouth = cycle < 0.3 ? cycle / 0.3 : 1 - (cycle - 0.3) / 0.7;
          targetMouth = Math.max(0, Math.min(1, targetMouth)) * 0.6;
        }
      } else if (audioDataRef.current) {
        targetMouth = processAudioData(audioDataRef.current);
      } else {
        // Pure fallback: rhythmic open-close
        const cycle = (elapsed % 300) / 300;
        targetMouth = cycle < 0.3 ? cycle / 0.3 : 1 - (cycle - 0.3) / 0.7;
        targetMouth = Math.max(0, Math.min(1, targetMouth)) * 0.6;
      }

      const s = smoothingRef.current;
      const smoothedMouth = prevMouthRef.current * s + targetMouth * (1 - s);
      prevMouthRef.current = smoothedMouth;

      onParameterChange?.(PARAM_MOUTH_OPEN_Y, smoothedMouth);
      onParameterChange?.(PARAM_MOUTH_FORM, smoothedMouth * 0.3);

      const angleTarget = Math.sin(Date.now() / 400) * 2;
      const smoothedAngle = prevAngleRef.current * 0.85 + angleTarget * 0.15;
      prevAngleRef.current = smoothedAngle;
      onParameterChange?.(PARAM_ANGLE_Z, smoothedAngle);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onParameterChange]);

  return null;
};

export default LipSync;
