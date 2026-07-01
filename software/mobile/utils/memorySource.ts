type MemorySourceEntity = {
  id?: string | null;
  name?: string | null;
} | null | undefined;

export function buildMemorySourceMetadata(_params: {
  sourcePage: string;
  route?: MemorySourceEntity;
  spot?: MemorySourceEntity;
  extra?: Record<string, any> | null;
}): Record<string, any> {
  const { sourcePage, route, spot, extra } = _params;
  const metadata: Record<string, any> = { ...(extra ?? {}) };

  metadata.source_page = sourcePage;

  if (route?.id) metadata.route_id = route.id;
  if (route?.name) metadata.route_name = route.name;
  if (spot?.id) metadata.spot_id = spot.id;
  if (spot?.name) metadata.spot_name = spot.name;

  return metadata;
}
