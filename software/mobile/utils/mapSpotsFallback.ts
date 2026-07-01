import type { Spot } from '@/api/spots';
import { getDemoSpotById, getDemoSpots } from '@/utils/localDemoData';

export function filterMappableSpots(spots: Spot[]): Spot[] {
  return spots.filter((spot) => spot.latitude != null && spot.longitude != null);
}

export function applyTrustedLingshanCoordinates(spot: Spot): Spot {
  const localSpot = getDemoSpotById(spot.id);
  if (localSpot?.latitude == null || localSpot.longitude == null) return spot;

  return {
    ...spot,
    latitude: localSpot.latitude,
    longitude: localSpot.longitude,
  };
}

export function getMapFallbackSpots(category?: string): Spot[] {
  return filterMappableSpots(getDemoSpots(category) as unknown as Spot[]);
}

export function normalizeMapSpotResponse(response: unknown, fallback = getMapFallbackSpots()): Spot[] {
  const data = (response as { data?: unknown })?.data ?? response;
  const mappableSpots = Array.isArray(data)
    ? filterMappableSpots((data as Spot[]).map(applyTrustedLingshanCoordinates))
    : [];

  return mappableSpots.length > 0 ? mappableSpots : fallback;
}
