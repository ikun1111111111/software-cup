import {
  getDemoRouteById,
  getDemoRoutes,
  getDemoSpotById,
  getDemoSpots,
} from '../utils/localDemoData';
import { SPOT_LOCATIONS } from '../constants/spot-locations';
import { LINGSHAN_ROUTES } from '../data/lingshanRoutes';
import { getDefaultGuideRoute } from '../data/lingshanGuideData';
import { getMockApiRoutes, getMockApiSpots } from '../mocks/guide';

describe('localDemoData', () => {
  test('provides enough routes for offline competition demo', () => {
    const routes = getDemoRoutes();

    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes.some((route) => route.id === 'lingshan-history-six-hours')).toBe(true);
  });

  test('classic route contains ordered spots and route detail metadata', () => {
    const route = getDemoRouteById('lingshan-history-six-hours');

    expect(route?.spot_order).toEqual([
      'ling-shan-da-zhao-bi',
      'wu-zhi-men',
      'pu-ti-da-dao',
      'jiu-long-guan-yu',
      'xiang-mo-fu-diao',
      'a-yu-wang-zhu',
      'xiang-fu-chan-si',
      'ling-shan-da-fo',
      'fo-jiao-wen-hua-blan-guan',
      'fan-gong',
      'wu-yin-tan-cheng',
    ]);
    expect(route?.spot_names.map((spot) => spot.name)).toContain('灵山大佛');
    expect(route?.spot_details['ling-shan-da-fo'].讲解重点.join('')).toContain('88米');
  });

  test('spots provide detail fallback for route pages', () => {
    const spot = getDemoSpotById('fan-gong');

    expect(spot?.name).toBe('灵山梵宫');
    expect(spot?.detail).toContain('佛教艺术');
    expect(getDemoSpots()).toHaveLength(19);
  });

  test('spot ids are unique and include full Lingshan guide coverage', () => {
    const spots = getDemoSpots();
    const ids = spots.map((spot) => spot.id);

    expect(new Set(ids).size).toBe(19);
    expect(ids).toEqual(expect.arrayContaining([
      'ling-shan-da-fo',
      'fan-gong',
      'jiu-long-guan-yu',
      'wu-yin-tan-cheng',
      'xiang-fu-chan-si',
      'fo-shou-guang-chang',
      'bai-zi-xi-mi-le',
      'man-fei-long-ta',
      'ling-shan-jing-she',
      'ling-shan-da-zhao-bi',
      'pu-ti-da-dao',
      'wu-ming-qiao',
      'fo-zu-tan',
      'wu-zhi-men',
      'xiang-mo-fu-diao',
      'a-yu-wang-zhu',
      'fo-jiao-wen-hua-blan-guan',
      'san-sheng-dian',
      'wu-jin-yi-zhai',
    ]));
  });

  test('all route spots resolve to demo spots and map locations', () => {
    const spotIds = new Set(getDemoSpots().map((spot) => spot.id));

    for (const route of getDemoRoutes()) {
      expect(route.spot_order.length).toBeGreaterThan(0);
      for (const spotId of route.spot_order) {
        expect(spotIds.has(spotId)).toBe(true);
        expect(SPOT_LOCATIONS[spotId]).toBeTruthy();
      }
    }
  });

  test('canonical routes are unique and shared by demo and guide adapters', () => {
    expect(LINGSHAN_ROUTES).toHaveLength(3);
    expect(new Set(LINGSHAN_ROUTES.map((route) => route.id)).size).toBe(3);

    for (const route of LINGSHAN_ROUTES) {
      const demoRoute = getDemoRouteById(route.id);
      const mockRoute = getMockApiRoutes().find((item) => item.id === route.id) as any;

      expect(demoRoute?.spot_order).toEqual(route.spot_order);
      expect(mockRoute?.spot_order).toEqual(route.spot_order);
    }

    expect(getDefaultGuideRoute('history').stops.map((spot) => spot.id)).toEqual(
      LINGSHAN_ROUTES[0].spot_order,
    );
    expect(getDefaultGuideRoute('nature').stops.map((spot) => spot.id)).toEqual(
      LINGSHAN_ROUTES[1].spot_order,
    );
    expect(getDefaultGuideRoute('family').stops.map((spot) => spot.id)).toEqual(
      LINGSHAN_ROUTES[2].spot_order,
    );
  });

  test('mock guide spots expose full scenic map coverage', () => {
    expect(getMockApiSpots()).toHaveLength(19);
  });
});
