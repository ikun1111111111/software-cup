import { resolveVRMViewActivity } from '../components/vrm/vrmViewActivity';

describe('VRM view activity', () => {
  test('route-owned VRM pauses when its screen loses focus', () => {
    expect(resolveVRMViewActivity({
      focusMode: 'route',
      mounted: true,
      screenFocused: false,
    })).toBe(false);
  });

  test('component-owned VRM stays active outside route focus until unmounted', () => {
    expect(resolveVRMViewActivity({
      focusMode: 'component',
      mounted: true,
      screenFocused: false,
    })).toBe(true);
    expect(resolveVRMViewActivity({
      focusMode: 'component',
      mounted: false,
      screenFocused: true,
    })).toBe(false);
  });
});
