export function getSpotViewportSignature(
  spots: Array<{ id: string; latitude?: number | null; longitude?: number | null }>,
) {
  return spots
    .filter((spot) => spot.latitude != null && spot.longitude != null)
    .map((spot) => `${spot.id}:${spot.latitude}:${spot.longitude}`)
    .join('|');
}
