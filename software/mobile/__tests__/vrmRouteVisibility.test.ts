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
    expect(shouldHideFloatingVRM('/')).toBe(true);
    expect(shouldHideFloatingVRM('/chat')).toBe(true);
    expect(shouldHideFloatingVRM('/(tabs)/explore')).toBe(true);
    expect(shouldHideFloatingVRM('/attractions')).toBe(true);
    expect(shouldHideFloatingVRM('/routes')).toBe(true);
    expect(shouldHideFloatingVRM('/map')).toBe(true);
    expect(shouldHideFloatingVRM('/map-calibration')).toBe(true);
    expect(shouldHideFloatingVRM('/auth/login')).toBe(true);
    expect(shouldHideFloatingVRM('/auth/register')).toBe(true);
    expect(shouldHideFloatingVRM('/memory')).toBe(true);
    expect(shouldHideFloatingVRM('/profile')).toBe(true);
    expect(shouldHideFloatingVRM('/history')).toBe(true);
  });

  test('hides global floating Xiaoling on detail pages with a local dock', () => {
    expect(shouldHideFloatingVRM('/attractions/ling-shan-da-fo')).toBe(true);
    expect(shouldHideFloatingVRM('/routes/classic-route')).toBe(true);
  });

  test('hides the manual VRM reload button on pages with local stages', () => {
    expect(shouldShowManualVRMLoadButton('/')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/routes')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/attractions')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/memory')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/profile')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/history')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/attractions/ling-shan-da-fo')).toBe(false);
    expect(shouldShowManualVRMLoadButton('/routes/classic-route')).toBe(false);
  });
});
