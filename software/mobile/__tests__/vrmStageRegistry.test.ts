import { getActiveStageTarget, hasUsableStageRect } from '../components/vrm/vrmStageRegistry';
import type { VRMStageTarget } from '../components/vrm/VRMStageTypes';

function makeTarget(id: string, updatedAt: number, width = 100, height = 120): VRMStageTarget {
  return {
    id,
    mode: 'float',
    rect: { x: 0, y: 0, width, height },
    updatedAt,
  };
}

describe('VRM stage registry', () => {
  test('selects the most recently updated target', () => {
    const first = makeTarget('routes', 10);
    const second = makeTarget('map', 20);

    expect(getActiveStageTarget([first, second])).toBe(second);
  });

  test('falls back to deterministic id ordering when timestamps tie', () => {
    const first = makeTarget('routes', 10);
    const second = makeTarget('map', 10);

    expect(getActiveStageTarget([first, second])).toBe(second);
  });

  test('treats zero-size or hidden targets as not renderable', () => {
    expect(hasUsableStageRect(makeTarget('ok', 1))).toBe(true);
    expect(hasUsableStageRect(makeTarget('zero-width', 1, 0, 120))).toBe(false);
    expect(hasUsableStageRect({ ...makeTarget('hidden', 1), visible: false })).toBe(false);
    expect(hasUsableStageRect(null)).toBe(false);
  });
});
