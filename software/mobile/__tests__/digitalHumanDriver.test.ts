import {
  computeLookUpHeadRotation,
  estimateNarrationDurationSeconds,
  estimateSpeechDuration,
} from '../utils/digitalHumanDriver';

describe('digitalHumanDriver utilities', () => {
  test('estimateSpeechDuration respects minimum duration', () => {
    expect(estimateSpeechDuration('短句')).toBe(3000);
  });

  test('estimateSpeechDuration scales with text length', () => {
    expect(estimateSpeechDuration('a'.repeat(30))).toBe(6600);
  });

  test('estimateNarrationDurationSeconds uses the speech estimate without a 30 second floor', () => {
    expect(estimateNarrationDurationSeconds('短句')).toBe(3);
  });

  test('estimateNarrationDurationSeconds respects a real provided duration', () => {
    expect(estimateNarrationDurationSeconds('a'.repeat(200), 9.7)).toBe(9.7);
  });

  test('computeLookUpHeadRotation starts and ends at neutral', () => {
    expect(computeLookUpHeadRotation(0, 1000)).toEqual({ x: -0, y: 0 });
    const end = computeLookUpHeadRotation(1000, 1000);
    expect(Math.abs(end.x)).toBeLessThan(0.0001);
    expect(Math.abs(end.y)).toBeLessThan(0.0001);
  });

  test('computeLookUpHeadRotation reaches peak during middle segment', () => {
    expect(computeLookUpHeadRotation(500, 1000)).toEqual({ x: -0.8, y: 0.6 });
  });
});
