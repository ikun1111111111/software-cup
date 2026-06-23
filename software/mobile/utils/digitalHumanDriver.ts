export interface HeadRotation {
  x: number;
  y: number;
}

export function estimateSpeechDuration(text: string, minMs = 3000, msPerChar = 150): number {
  return Math.max(minMs, text.length * msPerChar);
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
