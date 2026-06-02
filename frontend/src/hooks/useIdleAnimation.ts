import { useCallback, useEffect, useRef } from 'react';

export interface IdleAnimationOptions {
  enabled?: boolean;
  blinkIntervalMin?: number;  // ms
  blinkIntervalMax?: number;  // ms
  blinkDuration?: number;     // ms (how long the blink lasts)
  breathAmplitude?: number;   // 0-1
  breathCycle?: number;       // seconds per breath cycle
}

/**
 * Drives idle animations on a Live2D model:
 * - Random blinking at natural intervals
 * - Subtle breathing/body sway
 */
export const useIdleAnimation = (
  setParameter: (id: string, value: number) => void,
  options: IdleAnimationOptions = {},
) => {
  const {
    enabled = true,
    blinkIntervalMin = 2500,
    blinkIntervalMax = 6000,
    blinkDuration = 120,
    breathAmplitude = 0.5,
    breathCycle = 4,
  } = options;

  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const breathRafRef = useRef<number>();
  const startTimeRef = useRef(Date.now());

  // Blink logic
  const scheduleBlink = useCallback(() => {
    if (!enabled) return;
    const delay = blinkIntervalMin + Math.random() * (blinkIntervalMax - blinkIntervalMin);
    blinkTimerRef.current = setTimeout(() => {
      if (!enabled) return;
      // Close eyes
      setParameter('ParamEyeLOpen', 0);
      setParameter('ParamEyeROpen', 0);

      // Open eyes after blink duration
      setTimeout(() => {
        setParameter('ParamEyeLOpen', 1);
        setParameter('ParamEyeROpen', 1);
      }, blinkDuration);

      scheduleBlink();
    }, delay);
  }, [enabled, blinkIntervalMin, blinkIntervalMax, blinkDuration, setParameter]);

  // Breathing logic
  const breathLoop = useCallback(() => {
    if (!enabled) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const t = (elapsed / breathCycle) * 2 * Math.PI;
    const breathValue = Math.sin(t) * breathAmplitude;

    // Subtle body angle for breathing effect
    setParameter('ParamBodyAngleX', breathValue * 2);
    setParameter('ParamBodyAngleY', Math.sin(t * 0.7) * 1.5);
    setParameter('ParamBodyAngleZ', Math.sin(t * 0.5) * 1);

    breathRafRef.current = requestAnimationFrame(breathLoop);
  }, [enabled, breathAmplitude, breathCycle, setParameter]);

  useEffect(() => {
    if (!enabled) return;

    scheduleBlink();
    breathRafRef.current = requestAnimationFrame(breathLoop);

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      if (breathRafRef.current) cancelAnimationFrame(breathRafRef.current);
    };
  }, [enabled, scheduleBlink, breathLoop]);
};

export default useIdleAnimation;
