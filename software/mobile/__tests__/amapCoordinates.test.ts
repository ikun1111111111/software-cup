import { toAmapPoint, toScenicAmapPoint } from '../utils/amapCoordinates';
import { wgs84ToGcj02 } from '../utils/geoCoordinates';

const LINGSHAN_CENTER = { latitude: 31.4268, longitude: 120.0962 };

describe('AMap coordinate preparation', () => {
  test('keeps explicit GCJ-02 coordinates without applying another offset', () => {
    expect(toAmapPoint({ latitude: 31.4243, longitude: 120.0952 }, 'gcj02')).toEqual({
      latitude: 31.4243,
      longitude: 120.0952,
    });
  });

  test('keeps local Lingshan scenic coordinates on the AMap GCJ-02 grid by default', () => {
    expect(toScenicAmapPoint(LINGSHAN_CENTER)).toEqual(LINGSHAN_CENTER);
  });

  test('converts explicit local GPS coordinates to the AMap GCJ-02 grid', () => {
    expect(toScenicAmapPoint(LINGSHAN_CENTER, 'wgs84')).toEqual(
      wgs84ToGcj02(LINGSHAN_CENTER.latitude, LINGSHAN_CENTER.longitude),
    );
  });

  test('converts device GPS coordinates from WGS-84 before showing them on AMap', () => {
    const gps = { latitude: 31.4263, longitude: 120.0961, source: 'wgs84' as const };

    expect(toAmapPoint(gps)).toEqual(wgs84ToGcj02(gps.latitude, gps.longitude));
  });
});
