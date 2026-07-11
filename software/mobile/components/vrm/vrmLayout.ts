import { normalizeVRMRoutePath, shouldHideFloatingVRM } from './vrmRouteVisibility';

export interface VRMFloatingMetrics {
  width: number;
  height: number;
  bottom: number;
  right: number;
  hotZone: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  avoidance: {
    right: number;
    bottom: number;
    width: number;
    height: number;
    visible: boolean;
  };
}

export const VRM_LAYER_Z_INDEX = 70;
export const TAB_BAR_HEIGHT = 72;

const AVATAR_ASPECT = 0.68;
const STAGE_RIGHT = 10;
const STACK_BOTTOM = 14;
const TAB_BOTTOM_GAP = 8;

const TAB_ROUTES = new Set(['/', '/memory', '/profile']);

function getAvatarHeight(screenHeight: number): number {
  const target = Math.round(screenHeight * 0.44);
  const cap = screenHeight < 720 ? 320 : 360;
  const floor = screenHeight < 640 ? 240 : 260;
  return Math.max(floor, Math.min(target, cap));
}

function getBottomOffset(pathname: string, safeAreaBottom: number): number {
  const normalized = normalizeVRMRoutePath(pathname);
  if (TAB_ROUTES.has(normalized)) {
    return safeAreaBottom + TAB_BAR_HEIGHT + TAB_BOTTOM_GAP;
  }
  return safeAreaBottom + STACK_BOTTOM;
}

export function getVRMFloatingMetrics({
  pathname,
  safeAreaBottom,
  screenHeight,
}: {
  pathname: string;
  safeAreaBottom: number;
  screenWidth: number;
  screenHeight: number;
}): VRMFloatingMetrics {
  const visible = !shouldHideFloatingVRM(pathname);
  const height = getAvatarHeight(screenHeight);
  const width = Math.round(height * AVATAR_ASPECT);
  const bottom = getBottomOffset(pathname, safeAreaBottom);
  const right = STAGE_RIGHT;
  const hotZone = {
    left: Math.round(width * 0.16),
    top: Math.round(height * 0.06),
    width: Math.round(width * 0.68),
    height: Math.round(height * 0.86),
  };

  return {
    width,
    height,
    bottom,
    right,
    hotZone,
    avoidance: {
      right: visible ? width + right + 18 : 0,
      bottom: visible ? bottom + Math.round(height * 0.58) : 0,
      width: visible ? width : 0,
      height: visible ? height : 0,
      visible,
    },
  };
}
