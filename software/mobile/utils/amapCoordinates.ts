import { wgs84ToGcj02 } from './geoCoordinates';

export type CoordinateSource = 'gcj02' | 'wgs84';
export type MapPoint = { latitude: number; longitude: number; source?: CoordinateSource };
export const SCENIC_COORDINATE_SOURCE: CoordinateSource = 'gcj02';

export function toAmapPoint(point: MapPoint, source?: CoordinateSource) {
  if (source === 'wgs84' || point.source === 'wgs84') {
    return wgs84ToGcj02(point.latitude, point.longitude);
  }
  return { latitude: point.latitude, longitude: point.longitude };
}

export function toScenicAmapPoint(point: MapPoint, source?: CoordinateSource) {
  return toAmapPoint(point, source ?? point.source ?? SCENIC_COORDINATE_SOURCE);
}
