export type MapGuideAction =
  | 'idle'
  | 'narrating'
  | 'routing'
  | 'arrived'
  | 'asking'
  | 'opening_detail'
  | 'selecting_route';

export type MapActionStatus = 'idle' | 'pending' | 'success' | 'blocked' | 'error';

export interface MapActionState {
  action: MapGuideAction;
  status: MapActionStatus;
  message: string;
  spotId?: string;
  updatedAt: number;
}

export const MAP_ACTION_COOLDOWN_MS = 800;

export function createMapActionState({
  action,
  status,
  message,
  spotId,
  now = Date.now(),
}: {
  action: MapGuideAction;
  status: MapActionStatus;
  message: string;
  spotId?: string;
  now?: number;
}): MapActionState {
  return {
    action,
    status,
    message,
    spotId,
    updatedAt: now,
  };
}

export function isActionCoolingDown(
  state: MapActionState | null,
  action: MapGuideAction,
  now = Date.now(),
  cooldownMs = MAP_ACTION_COOLDOWN_MS,
) {
  return !!state && state.action === action && now - state.updatedAt <= cooldownMs;
}

export function getRouteActionButton({
  hasActiveSpot,
  hasCoordinates,
  isNavigating,
  isMapReady,
}: {
  hasActiveSpot: boolean;
  hasCoordinates: boolean;
  isNavigating: boolean;
  isMapReady: boolean;
}) {
  if (!hasActiveSpot) {
    return { label: '先选景点', disabled: true, pending: false };
  }
  if (!hasCoordinates) {
    return { label: '暂无坐标', disabled: true, pending: false };
  }
  if (isNavigating) {
    return { label: '结束指路', disabled: false, pending: false };
  }
  if (!isMapReady) {
    return { label: '路线已准备', disabled: false, pending: true };
  }
  return { label: '小灵指路', disabled: false, pending: false };
}

export function getRouteBlockedMessage(spotName: string | null) {
  if (!spotName) return '先点一个景点，小灵再帮你讲解或指路。';
  return `${spotName}还没有坐标，暂时不能规划路线。`;
}
