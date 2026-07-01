export type CalibrationPoint = { latitude: number; longitude: number };
export type CalibrationDirection = 'north' | 'south' | 'east' | 'west';
export type CalibrationCoordinates = Record<string, CalibrationPoint>;
type MappableSpot = { id: string; name?: string; latitude?: number | null; longitude?: number | null };

export function formatCoordinate(value: number) {
  return Number(value.toFixed(6)).toString();
}

export function buildCoordinateSnippet(point: CalibrationPoint) {
  return `latitude: ${formatCoordinate(point.latitude)}, longitude: ${formatCoordinate(point.longitude)}`;
}

export function mergeCalibrationCoordinates<T extends MappableSpot>(
  spots: T[],
  coordinates: CalibrationCoordinates,
): T[] {
  return spots.map((spot) => {
    const calibrated = coordinates[spot.id];
    if (!calibrated) return spot;
    return {
      ...spot,
      latitude: calibrated.latitude,
      longitude: calibrated.longitude,
    };
  });
}

export function buildChangedSpotSnippet(
  spots: Array<Pick<MappableSpot, 'id' | 'name'>>,
  coordinates: CalibrationCoordinates,
) {
  return spots
    .filter((spot) => coordinates[spot.id])
    .map((spot) => {
      const point = coordinates[spot.id];
      return [
        `${spot.id} ${spot.name}`,
        `latitude: ${formatCoordinate(point.latitude)},`,
        `longitude: ${formatCoordinate(point.longitude)},`,
      ].join('\n');
    })
    .join('\n\n');
}

export function nudgeCoordinate(
  point: CalibrationPoint,
  direction: CalibrationDirection,
  step: number,
): CalibrationPoint {
  switch (direction) {
    case 'north':
      return { ...point, latitude: point.latitude + step };
    case 'south':
      return { ...point, latitude: point.latitude - step };
    case 'east':
      return { ...point, longitude: point.longitude + step };
    case 'west':
      return { ...point, longitude: point.longitude - step };
  }
}
