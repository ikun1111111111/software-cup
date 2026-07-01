import {
  clampMapDockOffset,
  getMapDockOffsets,
  getNearestMapDockLevel,
} from '../utils/mapDock';

describe('map dock drag helpers', () => {
  test('keeps the collapsed dock usable while revealing more map', () => {
    const offsets = getMapDockOffsets(812);

    expect(offsets.expanded).toBe(0);
    expect(offsets.half).toBeGreaterThanOrEqual(190);
    expect(offsets.half).toBeLessThan(offsets.collapsed);
    expect(offsets.collapsed).toBeGreaterThanOrEqual(360);
    expect(offsets.collapsed).toBeLessThanOrEqual(480);
  });

  test('clamps drag offset inside the dock travel range', () => {
    const offsets = getMapDockOffsets(812);

    expect(clampMapDockOffset(-40, offsets)).toBe(0);
    expect(clampMapDockOffset(offsets.collapsed + 80, offsets)).toBe(offsets.collapsed);
  });

  test('snaps to the nearest level after a drag', () => {
    const offsets = getMapDockOffsets(812);

    expect(getNearestMapDockLevel(24, 0, offsets)).toBe('expanded');
    expect(getNearestMapDockLevel(offsets.half + 8, 0, offsets)).toBe('half');
    expect(getNearestMapDockLevel(offsets.collapsed - 8, 0, offsets)).toBe('collapsed');
  });

  test('uses fling direction to move one level at a time', () => {
    const offsets = getMapDockOffsets(812);

    expect(getNearestMapDockLevel(20, 0.9, offsets)).toBe('half');
    expect(getNearestMapDockLevel(offsets.half + 10, 0.9, offsets)).toBe('collapsed');
    expect(getNearestMapDockLevel(offsets.collapsed - 10, -0.9, offsets)).toBe('half');
    expect(getNearestMapDockLevel(offsets.half - 10, -0.9, offsets)).toBe('expanded');
  });
});
