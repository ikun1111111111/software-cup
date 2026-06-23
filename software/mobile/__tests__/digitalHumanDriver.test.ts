import { computeLookUpHeadRotation, estimateSpeechDuration } from '../utils/digitalHumanDriver';

describe('digitalHumanDriver utilities', () => {
  test('estimateSpeechDuration respects minimum duration', () => {
    expect(estimateSpeechDuration('短句')).toBe(3000);
  });

  test('estimateSpeechDuration scales with text length', () => {
    expect(estimateSpeechDuration('a'.repeat(30))).toBe(4500);
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
