// 灵山胜境各景点GPS坐标（WGS84坐标系）
// 数据来源：移动端统一景点数据

import { LINGSHAN_SPOTS } from '@/data/lingshanSpots';

export interface SpotLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const SPOT_LOCATIONS: Record<string, SpotLocation> = Object.fromEntries(
  LINGSHAN_SPOTS
    .filter((spot) => spot.latitude != null && spot.longitude != null)
    .map((spot) => [
      spot.id,
      {
        id: spot.id,
        name: spot.name,
        latitude: spot.latitude!,
        longitude: spot.longitude!,
      },
    ]),
);

/**
 * 获取景点GPS坐标
 */
export function getSpotLocation(spotId: string): SpotLocation | null {
  return SPOT_LOCATIONS[spotId] || null;
}

/**
 * 为景点列表注入GPS坐标
 */
export function enrichSpotsWithLocations(
  spots: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string; latitude?: number; longitude?: number }> {
  return spots.map((spot) => {
    const location = SPOT_LOCATIONS[spot.id];
    return {
      id: spot.id,
      name: spot.name,
      latitude: location?.latitude,
      longitude: location?.longitude,
    };
  });
}
