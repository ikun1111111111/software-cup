import {
  getSpeechLipWeights,
  type SpeechLipWeights,
} from '../components/vrm/VRMIdleAnim';

const values = (weights: SpeechLipWeights) => Object.values(weights);

describe('VRM speech lip weights', () => {
  test('closes every speech viseme when not speaking', () => {
    expect(getSpeechLipWeights(0.9, 0.2, false)).toEqual({
      aa: 0,
      ih: 0,
      ou: 0,
      ee: 0,
      oh: 0,
    });
  });

  test('cycles through several dominant visemes while speaking', () => {
    const dominantShapes = [0.02, 0.14, 0.26, 0.38, 0.5, 0.62]
      .map((elapsed) => getSpeechLipWeights(0.85, elapsed, true))
      .map((weights) => Object.entries(weights)
        .sort(([, left], [, right]) => right - left)[0])
      .filter((entry) => entry[1] > 0.05)
      .map(([shape]) => shape);

    expect(new Set(dominantShapes).size).toBeGreaterThanOrEqual(3);
  });

  test('keeps every viseme finite and within the VRM expression range', () => {
    for (const elapsed of [0, 0.1, 0.25, 0.5, 0.9, 1.4]) {
      for (const weight of values(getSpeechLipWeights(2, elapsed, true))) {
        expect(Number.isFinite(weight)).toBe(true);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    }
  });

  test('contains a brief near-closed beat between syllable groups', () => {
    const samples = Array.from({ length: 80 }, (_, index) =>
      Math.max(...values(getSpeechLipWeights(0.8, index * 0.01, true))),
    );

    expect(Math.min(...samples)).toBeLessThan(0.08);
    expect(Math.max(...samples)).toBeGreaterThan(0.35);
  });
});
