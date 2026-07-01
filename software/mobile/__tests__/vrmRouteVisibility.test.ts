import {
  normalizeVRMRoutePath,
  shouldShowManualVRMLoadButton,
  shouldHideFloatingVRM,
} from '../components/vrm/vrmRouteVisibility';

describe('VRM floating route visibility', () => {
  test('normalizes expo route groups and trailing slash', () => {
    expect(normalizeVRMRoutePath('/(tabs)/chat/')).toBe('/chat');
    expect(normalizeVRMRoutePath('/')).toBe('/');
  });

  test('hides global floating Xiaoling on pages that own a local VRM stage', () => {
    expect(shouldHideFloatingVRM('/chat')).toBe(true);
    expect(shouldHideFloatingVRM('/(tabs)/explore')).toBe(true);
    expect(shouldHideFloatingVRM('/attractions')).toBe(true);
    expect(shouldHideFloatingVRM('/routes')).toBe(true);
    expect(shouldHideFloatingVRM('/map')).toBe(true);
    expect(shouldHideFloatingVRM('/map-calibration')).toBe(true);
    expect(shouldHideFloatingVRM('/auth/login')).toBe(true);
    expect(shouldHideFloatingVRM('/auth/register')).toBe(true);
  });

  test('keeps floating Xiaoling on detail pages without a local VRM stage', () => {
    expect(shouldHideFloatingVRM('/attractions/ling-shan-da-fo')).toBe(false);
    expect(shouldHideFloatingVRM('/routes/classic-route')).toBe(false);
    expect(shouldHideFloatingVRM('/history')).toBe(false);
    expect(shouldHideFloatingVRM('/memory')).toBe(false);
    expect(shouldHideFloatingVRM('/profile')).toBe(false);
  });

  test('hides the manual VRM reload button on pages with local stages', () => {
    expect(shouldShowManualVRMLoadButton('/routes')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/attractions')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/memory')).toBe(true);
  });
});
