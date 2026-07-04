export type MapDockLevel = 'expanded' | 'half' | 'collapsed';

export type MapDockOffsets = Record<MapDockLevel, number>;

const MIN_HALF_OFFSET = 230;
const MAX_HALF_OFFSET = 310;
const MIN_COLLAPSED_OFFSET = 380;
const MAX_COLLAPSED_OFFSET = 430;
const MIN_LEVEL_GAP = 90;
const FLING_VELOCITY = 0.65;

export function getMapDockOffsets(viewportHeight: number): MapDockOffsets {
  const safeHeight = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const collapsed = Math.round(
    Math.min(MAX_COLLAPSED_OFFSET, Math.max(MIN_COLLAPSED_OFFSET, safeHeight * 0.54)),
  );
  const preferredHalf = Math.round(
    Math.min(MAX_HALF_OFFSET, Math.max(MIN_HALF_OFFSET, safeHeight * 0.37)),
  );

  return {
    expanded: 0,
    half: Math.min(preferredHalf, collapsed - MIN_LEVEL_GAP),
    collapsed,
  };
}

export function clampMapDockOffset(offset: number, offsets: MapDockOffsets) {
  return Math.min(offsets.collapsed, Math.max(offsets.expanded, offset));
}

export function getNearestMapDockLevel(
  offset: number,
  velocityY: number,
  offsets: MapDockOffsets,
): MapDockLevel {
  const clampedOffset = clampMapDockOffset(offset, offsets);

  if (velocityY >= FLING_VELOCITY) {
    return clampedOffset < offsets.half ? 'half' : 'collapsed';
  }

  if (velocityY <= -FLING_VELOCITY) {
    return clampedOffset > offsets.half ? 'half' : 'expanded';
  }

  const halfThreshold = offsets.half / 2;
  const collapsedThreshold = (offsets.half + offsets.collapsed) / 2;

  if (clampedOffset < halfThreshold) return 'expanded';
  if (clampedOffset < collapsedThreshold) return 'half';
  return 'collapsed';
}

export function getNextMapDockLevel(level: MapDockLevel): MapDockLevel {
  if (level === 'expanded') return 'half';
  if (level === 'half') return 'collapsed';
  return 'expanded';
}
