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
  const breathRafRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const setParameterRef = useRef(setParameter);

  // Keep refs in sync
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { setParameterRef.current = setParameter; }, [setParameter]);

  // Blink logic
  const scheduleBlink = useCallback(() => {
    if (!enabledRef.current || !mountedRef.current) return;
    const delay = blinkIntervalMin + Math.random() * (blinkIntervalMax - blinkIntervalMin);
    blinkTimerRef.current = setTimeout(() => {
      if (!enabledRef.current || !mountedRef.current) return;
      // Close eyes
      setParameterRef.current('ParamEyeLOpen', 0);
      setParameterRef.current('ParamEyeROpen', 0);

      // Open eyes after blink duration
      setTimeout(() => {
        if (!mountedRef.current) return;
        setParameterRef.current('ParamEyeLOpen', 1);
        setParameterRef.current('ParamEyeROpen', 1);
      }, blinkDuration);

      scheduleBlink();
    }, delay);
  }, [blinkIntervalMin, blinkIntervalMax, blinkDuration]);

  // Breathing logic
  const breathLoop = useCallback(() => {
    if (!enabledRef.current || !mountedRef.current) {
      // Stop the loop when disabled or unmounted
      return;
    }
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const t = (elapsed / breathCycle) * 2 * Math.PI;
    const breathValue = Math.sin(t) * breathAmplitude;

    // Subtle body angle for breathing effect
    setParameterRef.current('ParamBodyAngleX', breathValue * 2);
    setParameterRef.current('ParamBodyAngleY', Math.sin(t * 0.7) * 1.5);
    setParameterRef.current('ParamBodyAngleZ', Math.sin(t * 0.5) * 1);

    breathRafRef.current = requestAnimationFrame(breathLoop);
  }, [breathAmplitude, breathCycle]);

  useEffect(() => {
    mountedRef.current = true;
    enabledRef.current = enabled;
    startTimeRef.current = Date.now();

    if (enabled) {
      scheduleBlink();
      breathRafRef.current = requestAnimationFrame(breathLoop);
    }

    return () => {
      mountedRef.current = false;
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = undefined;
      }
      if (breathRafRef.current) {
        cancelAnimationFrame(breathRafRef.current);
        breathRafRef.current = 0;
      }
    };
  }, [enabled, scheduleBlink, breathLoop]);
};

export default useIdleAnimation;
