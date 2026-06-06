import { describe, it, expect, vi } from 'vitest';
import * as avatarApi from '../api/avatar';

vi.mock('../api/request', () => ({
  get: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  post: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  put: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  del: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
}));

describe('avatar.ts', () => {
  describe('模块导出', () => {
    it('getAvatars应该是函数', () => {
      expect(typeof avatarApi.getAvatars).toBe('function');
    });
    it('getAvatar应该是函数', () => {
      expect(typeof avatarApi.getAvatar).toBe('function');
    });
    it('getActiveAvatar应该是函数', () => {
      expect(typeof avatarApi.getActiveAvatar).toBe('function');
    });
    it('createAvatar应该是函数', () => {
      expect(typeof avatarApi.createAvatar).toBe('function');
    });
    it('updateAvatar应该是函数', () => {
      expect(typeof avatarApi.updateAvatar).toBe('function');
    });
    it('deleteAvatar应该是函数', () => {
      expect(typeof avatarApi.deleteAvatar).toBe('function');
    });
    it('activateAvatar应该是函数', () => {
      expect(typeof avatarApi.activateAvatar).toBe('function');
    });
  });

  describe('getActiveAvatar', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.getActiveAvatar();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('updateAvatar', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.updateAvatar('1', { name: '测试' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('createAvatar', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.createAvatar({ name: '测试' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('activateAvatar', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.activateAvatar('1');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
