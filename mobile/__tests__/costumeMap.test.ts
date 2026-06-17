import { COSTUMES, ALL_COSTUME_IDS, getCostume } from '../constants/costumeMap';

describe('costumeMap', () => {
  test('COSTUMES 包含 6 套服装', () => {
    expect(Object.keys(COSTUMES)).toHaveLength(6);
  });

  test('ALL_COSTUME_IDS 与 COSTUMES 的 key 一致', () => {
    expect(ALL_COSTUME_IDS.sort()).toEqual(Object.keys(COSTUMES).sort());
  });

  test('每套服装都有必填字段', () => {
    for (const [id, costume] of Object.entries(COSTUMES)) {
      expect(costume.id).toBe(id);
      expect(costume.name).toBeTruthy();
      expect(costume.category).toBe('festival');
      expect(costume.description).toBeTruthy();
      expect(costume.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('getCostume 返回正确的服装', () => {
    expect(getCostume('festival-spring').name).toBe('锦绣红袍');
    expect(getCostume('festival-dragon').name).toBe('龙舟竞渡');
  });

  test('getCostume 对未知 ID 回退到默认服装', () => {
    expect(getCostume('unknown-id').id).toBe('festival-spring');
  });

  test('服装颜色都是有效的十六进制颜色', () => {
    for (const costume of Object.values(COSTUMES)) {
      expect(costume.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
