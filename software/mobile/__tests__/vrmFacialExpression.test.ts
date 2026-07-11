import { getExpressionWeights } from '../components/vrm/VRMIdleAnim';

describe('VRM facial expression composition', () => {
  test('composes surprise from wide eyes and a round mouth without a smile preset', () => {
    const weights = getExpressionWeights('surprised');

    expect(weights.surprised).toBe(0);
    expect(weights.happy).toBe(0);
    expect(weights.oh).toBeGreaterThanOrEqual(0.6);
  });

  test('keeps happy restrained for a natural digital guide expression', () => {
    const weights = getExpressionWeights('happy');

    expect(weights.happy).toBeLessThanOrEqual(0.3);
  });
});
