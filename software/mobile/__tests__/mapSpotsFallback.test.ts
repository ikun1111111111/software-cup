import {
  applyTrustedLingshanCoordinates,
  filterMappableSpots,
  getMapFallbackSpots,
  normalizeMapSpotResponse,
} from '../utils/mapSpotsFallback';

describe('map spots fallback', () => {
  test('provides local mappable spots immediately for the guide map', () => {
    const spots = getMapFallbackSpots();

    expect(spots.length).toBeGreaterThan(0);
    expect(spots.every((spot) => spot.latitude != null && spot.longitude != null)).toBe(true);
  });

  test('keeps only spots that can be shown on the map', () => {
    const spots = filterMappableSpots([
      { id: 'a', name: 'A', category: 'x', tags: null, overview: '', qr_code: null, latitude: 31, longitude: 120 },
      { id: 'b', name: 'B', category: 'x', tags: null, overview: '', qr_code: null, latitude: null, longitude: 120 },
    ]);

    expect(spots.map((spot) => spot.id)).toEqual(['a']);
  });

  test('falls back when online response is empty or malformed', () => {
    const fallback = [
      { id: 'fallback', name: 'Fallback', category: 'x', tags: null, overview: '', qr_code: null, latitude: 31, longitude: 120 },
    ];

    expect(normalizeMapSpotResponse([], fallback)).toEqual(fallback);
    expect(normalizeMapSpotResponse({ data: null }, fallback)).toEqual(fallback);
  });

  test('overrides stale remote coordinates for known Lingshan spots', () => {
    const remote = {
      id: 'ling-shan-da-fo',
      name: 'Remote name',
      category: 'x',
      tags: null,
      overview: 'remote overview',
      qr_code: null,
      latitude: 31.425,
      longitude: 120.355,
    };

    expect(applyTrustedLingshanCoordinates(remote)).toMatchObject({
      id: 'ling-shan-da-fo',
      name: 'Remote name',
      overview: 'remote overview',
      latitude: 31.4302,
      longitude: 120.0963,
    });
    expect(normalizeMapSpotResponse([remote])[0]).toMatchObject({
      latitude: 31.4302,
      longitude: 120.0963,
    });
  });

  test('keeps visible AMap anchor spots on their calibrated POI locations', () => {
    const spots = getMapFallbackSpots();
    const byId = Object.fromEntries(spots.map((spot) => [spot.id, spot]));

    expect(byId['fan-gong']).toMatchObject({ latitude: 31.4259, longitude: 120.1009 });
    expect(byId['jiu-long-guan-yu']).toMatchObject({ latitude: 31.4246, longitude: 120.0999 });
    expect(byId['xiang-fu-chan-si']).toMatchObject({ latitude: 31.428, longitude: 120.0977 });
    expect(byId['ling-shan-jing-she']).toMatchObject({ latitude: 31.4283, longitude: 120.1 });
  });
});
