import { getSpotViewportSignature } from '../utils/mapViewport';

describe('map viewport helpers', () => {
  test('ignores selection-only state when deciding whether spots changed', () => {
    const spots = [
      { id: 'ling-shan-da-zhao-bi', latitude: 31.4243, longitude: 120.0952, active: false },
      { id: 'wu-zhi-men', latitude: 31.4255, longitude: 120.0954, active: true },
    ];
    const sameSpotsWithDifferentSelection = [
      { id: 'ling-shan-da-zhao-bi', latitude: 31.4243, longitude: 120.0952, active: true },
      { id: 'wu-zhi-men', latitude: 31.4255, longitude: 120.0954, active: false },
    ];

    expect(getSpotViewportSignature(spots)).toBe(
      getSpotViewportSignature(sameSpotsWithDifferentSelection),
    );
  });

  test('changes when a recommended spot points to a different coordinate', () => {
    const first = [{ id: 'a-yu-wang-zhu', latitude: 31.4263, longitude: 120.0961 }];
    const moved = [{ id: 'a-yu-wang-zhu', latitude: 31.4245, longitude: 120.101 }];

    expect(getSpotViewportSignature(first)).not.toBe(getSpotViewportSignature(moved));
  });
});
