export interface HeadRotation {
  x: number;
  y: number;
}

export const DEFAULT_SPEECH_MIN_MS = 3000;
export const DEFAULT_SPEECH_MS_PER_CHAR = 220;

export function estimateSpeechDuration(
  text: string,
  minMs = DEFAULT_SPEECH_MIN_MS,
  msPerChar = DEFAULT_SPEECH_MS_PER_CHAR,
): number {
  return Math.max(minMs, text.length * msPerChar);
}

export function estimateNarrationDurationSeconds(text: string, providedSeconds?: number): number {
  if (typeof providedSeconds === 'number' && Number.isFinite(providedSeconds) && providedSeconds > 0) {
    return providedSeconds;
  }

  return estimateSpeechDuration(text) / 1000;
}

export function computeLookUpHeadRotation(
  elapsedMs: number,
  durationMs: number = 800,
): HeadRotation {
  if (durationMs <= 0) return { x: 0, y: 0 };

  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  const curve = progress < 0.2
    ? Math.pow(progress / 0.2, 2)
    : progress > 0.8
      ? Math.pow((1 - progress) / 0.2, 2)
      : 1;

  return { x: -0.8 * curve, y: 0.6 * curve };
}
