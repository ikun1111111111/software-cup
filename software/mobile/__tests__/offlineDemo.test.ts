import {
  getOfflineDemoRouteDetail,
  getOfflineDemoRoutes,
  isOfflineDemoRoute,
} from '../constants/offline-demo';

describe('offline demo routes', () => {
  test('keeps enough offline routes for competition demo mode', () => {
    expect(getOfflineDemoRoutes()).toHaveLength(3);
  });

  test('provides complete route details with ordered spots', () => {
    const route = getOfflineDemoRoutes()[0];
    const detail = getOfflineDemoRouteDetail(route.id);

    expect(detail?.duration).toBeTruthy();
    expect(detail?.spot_order.length).toBeGreaterThanOrEqual(3);
    expect(detail?.spot_names.map((spot) => spot.name)).toContain('灵山大佛');
  });

  test('filters routes by type and identifies demo route ids', () => {
    const familyRoutes = getOfflineDemoRoutes('family');

    expect(familyRoutes).toHaveLength(1);
    expect(isOfflineDemoRoute(familyRoutes[0].id)).toBe(true);
    expect(isOfflineDemoRoute('server-route')).toBe(false);
  });
});
