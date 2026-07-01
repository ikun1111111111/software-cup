import {
  buildChangedSpotSnippet,
  buildCoordinateSnippet,
  mergeCalibrationCoordinates,
  nudgeCoordinate,
} from '../utils/mapCalibration';

const spots = [
  {
    id: 'ling-shan-da-fo',
    name: '灵山大佛',
    category: '核心景点',
    tags: null,
    overview: '',
    qr_code: null,
    latitude: 31.4302,
    longitude: 120.0963,
  },
  {
    id: 'fan-gong',
    name: '灵山梵宫',
    category: '核心景点',
    tags: null,
    overview: '',
    qr_code: null,
    latitude: 31.4259,
    longitude: 120.1009,
  },
];

describe('map calibration helpers', () => {
  test('merges working coordinates without mutating source spots', () => {
    const merged = mergeCalibrationCoordinates(spots, {
      'fan-gong': { latitude: 31.42612345, longitude: 120.10198765 },
    });

    expect(merged[1]).toMatchObject({
      id: 'fan-gong',
      latitude: 31.42612345,
      longitude: 120.10198765,
    });
    expect(spots[1]).toMatchObject({
      latitude: 31.4259,
      longitude: 120.1009,
    });
  });

  test('formats a single coordinate snippet with stable precision', () => {
    expect(buildCoordinateSnippet({ latitude: 31.42612345, longitude: 120.10198765 })).toBe(
      'latitude: 31.426123, longitude: 120.101988',
    );
  });

  test('builds snippets only for changed spots in source order', () => {
    const snippet = buildChangedSpotSnippet(spots, {
      'fan-gong': { latitude: 31.42612345, longitude: 120.10198765 },
      unknown: { latitude: 1, longitude: 2 },
    });

    expect(snippet).toBe(
      [
        'fan-gong 灵山梵宫',
        'latitude: 31.426123,',
        'longitude: 120.101988,',
      ].join('\n'),
    );
  });

  test('nudges coordinates by latitude or longitude axis', () => {
    expect(nudgeCoordinate({ latitude: 31, longitude: 120 }, 'north', 0.0001)).toEqual({
      latitude: 31.0001,
      longitude: 120,
    });
    expect(nudgeCoordinate({ latitude: 31, longitude: 120 }, 'west', 0.0001)).toEqual({
      latitude: 31,
      longitude: 119.9999,
    });
  });
});
