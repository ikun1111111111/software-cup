import {
  createMapActionState,
  getRouteActionButton,
  getRouteBlockedMessage,
  isActionCoolingDown,
} from '../utils/mapGuideActions';

describe('map guide action helpers', () => {
  test('creates visible action state with a stable timestamp', () => {
    const state = createMapActionState({
      action: 'narrating',
      status: 'success',
      message: '小灵正在讲解灵山大照壁。',
      spotId: 'ling-shan-da-zhao-bi',
      now: 1000,
    });

    expect(state).toEqual({
      action: 'narrating',
      status: 'success',
      message: '小灵正在讲解灵山大照壁。',
      spotId: 'ling-shan-da-zhao-bi',
      updatedAt: 1000,
    });
  });

  test('blocks duplicate taps during the short action cooldown', () => {
    const state = createMapActionState({
      action: 'routing',
      status: 'pending',
      message: '路线已准备。',
      now: 2000,
    });

    expect(isActionCoolingDown(state, 'routing', 2600)).toBe(true);
    expect(isActionCoolingDown(state, 'routing', 2901)).toBe(false);
    expect(isActionCoolingDown(state, 'narrating', 2200)).toBe(false);
  });

  test('derives route button labels from map and navigation state', () => {
    expect(getRouteActionButton({
      hasActiveSpot: true,
      hasCoordinates: true,
      isNavigating: false,
      isMapReady: true,
    })).toEqual({ label: '小灵指路', disabled: false, pending: false });

    expect(getRouteActionButton({
      hasActiveSpot: true,
      hasCoordinates: true,
      isNavigating: true,
      isMapReady: true,
    })).toEqual({ label: '结束指路', disabled: false, pending: false });

    expect(getRouteActionButton({
      hasActiveSpot: true,
      hasCoordinates: true,
      isNavigating: false,
      isMapReady: false,
    })).toEqual({ label: '路线已准备', disabled: false, pending: true });
  });

  test('explains why route drawing is blocked', () => {
    expect(getRouteBlockedMessage(null)).toBe('先点一个景点，小灵再帮你讲解或指路。');
    expect(getRouteBlockedMessage('灵山大照壁')).toBe('灵山大照壁还没有坐标，暂时不能规划路线。');
  });
});
