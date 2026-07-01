export type CancelScheduledTask = () => void;

export function runAfterNextPaint(task: () => void): CancelScheduledTask {
  let cancelled = false;
  let frameId: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const runTask = () => {
    timerId = setTimeout(() => {
      timerId = null;
      if (!cancelled) task();
    }, 0);
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    frameId = globalThis.requestAnimationFrame(runTask);
  } else {
    runTask();
  }

  return () => {
    cancelled = true;
    if (frameId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(frameId);
    }
    if (timerId !== null) {
      clearTimeout(timerId);
    }
  };
}
