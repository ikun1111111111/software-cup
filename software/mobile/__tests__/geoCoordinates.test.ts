import { wgs84ToGcj02 } from '../utils/geoCoordinates';

describe('geo coordinate transforms', () => {
  test('converts Lingshan GPS coordinates before rendering on AMap', () => {
    const converted = wgs84ToGcj02(31.4263, 120.0961);

    expect(converted.latitude).toBeCloseTo(31.424515, 6);
    expect(converted.longitude).toBeCloseTo(120.101013, 6);
    expect(converted.latitude).toBeLessThan(31.4263);
    expect(converted.longitude).toBeGreaterThan(120.0961);
  });

  test('keeps coordinates outside China unchanged', () => {
    expect(wgs84ToGcj02(48.8566, 2.3522)).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });
});
