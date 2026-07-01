import { getVRMFloatingMetrics } from '../components/vrm/vrmLayout';

describe('VRM floating layout', () => {
  test('docks floating Xiaoling above the stack bottom on pages without a local stage', () => {
    const metrics = getVRMFloatingMetrics({
      pathname: '/routes/classic-route',
      safeAreaBottom: 20,
      screenWidth: 390,
      screenHeight: 844,
    });

    expect(metrics.avoidance.visible).toBe(true);
    expect(metrics.bottom).toBeGreaterThanOrEqual(20);
    expect(metrics.height).toBeLessThanOrEqual(292);
    expect(metrics.hotZone.width).toBeLessThan(metrics.width);
    expect(metrics.hotZone.height).toBeLessThan(metrics.height);
  });

  test('returns no avoidance area for pages with a local VRM stage', () => {
    const metrics = getVRMFloatingMetrics({
      pathname: '/map',
      safeAreaBottom: 0,
      screenWidth: 390,
      screenHeight: 844,
    });

    expect(metrics.avoidance.visible).toBe(false);
    expect(metrics.avoidance.right).toBe(0);
    expect(metrics.avoidance.bottom).toBe(0);
  });

  test('keeps detail pages visible with a useful avoidance area', () => {
    const metrics = getVRMFloatingMetrics({
      pathname: '/attractions/ling-shan-da-fo',
      safeAreaBottom: 12,
      screenWidth: 390,
      screenHeight: 720,
    });

    expect(metrics.avoidance.visible).toBe(true);
    expect(metrics.avoidance.right).toBeGreaterThan(metrics.width);
    expect(metrics.avoidance.bottom).toBeGreaterThan(metrics.bottom);
  });
});
