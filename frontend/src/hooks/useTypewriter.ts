import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayText: string;
  isComplete: boolean;
  skip: () => void;
}

export function useTypewriter({
  text,
  speed = 28,
  enabled = true,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const textRef = useRef(text);
  const charsRef = useRef(0);
  const charsAccumRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef(0);
  const prevTextRef = useRef('');
  const isCompleteRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clear = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const skip = useCallback(() => {
    clear();
    charsRef.current = textRef.current.length;
    charsAccumRef.current = 0;
    setDisplayText(textRef.current);
    if (!isCompleteRef.current) {
      isCompleteRef.current = true;
      setIsComplete(true);
      onCompleteRef.current?.();
    }
  }, [clear]);

  useEffect(() => {
    textRef.current = text;

    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;

    const prevText = prevTextRef.current;
    const isAppend = text.startsWith(prevText) && prevText.length > 0;

    prevTextRef.current = text;

    if (!enabled || !text) {
      clear();
      charsRef.current = text.length;
      charsAccumRef.current = 0;
      setDisplayText(text);
      if (!isCompleteRef.current) {
        isCompleteRef.current = true;
        setIsComplete(true);
        onCompleteRef.current?.();
      }
      return;
    }

    let needRestart = false;

    if (!wasEnabled && enabled) {
      if (text.length > 0 && prevText.length > 0) {
        clear();
        charsRef.current = text.length;
        charsAccumRef.current = 0;
        setDisplayText(text);
        isCompleteRef.current = true;
        setIsComplete(true);
        onCompleteRef.current?.();
        return;
      }
      charsRef.current = 0;
      charsAccumRef.current = 0;
      setDisplayText('');
      isCompleteRef.current = false;
      setIsComplete(false);
      needRestart = true;
    } else if (!isAppend) {
      charsRef.current = 0;
      charsAccumRef.current = 0;
      setDisplayText('');
      isCompleteRef.current = false;
      setIsComplete(false);
      needRestart = true;
    } else if (isCompleteRef.current) {
      isCompleteRef.current = false;
      setIsComplete(false);
      needRestart = true;
    } else if (rafRef.current === 0) {
      needRestart = true;
    }

    if (!needRestart) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;

      const remaining = textRef.current.length - charsRef.current;
      let effectiveSpeed: number;
      if (remaining > 40) effectiveSpeed = speed * 0.45;
      else if (remaining > 12) effectiveSpeed = speed * 0.85;
      else effectiveSpeed = speed * 1.35;

      charsAccumRef.current += dt / effectiveSpeed;

      if (charsAccumRef.current >= 1) {
        const step = Math.floor(charsAccumRef.current);
        charsAccumRef.current -= step;
        const next = Math.min(charsRef.current + step, textRef.current.length);
        if (next !== charsRef.current) {
          charsRef.current = next;
          setDisplayText(textRef.current.slice(0, next));
        }
      }

      if (charsRef.current >= textRef.current.length) {
        rafRef.current = 0;
        if (!isCompleteRef.current) {
          isCompleteRef.current = true;
          setIsComplete(true);
          onCompleteRef.current?.();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    clear();
    rafRef.current = requestAnimationFrame(tick);
    return clear;
  }, [text, speed, enabled, clear]);

  return { displayText, isComplete, skip };
}
