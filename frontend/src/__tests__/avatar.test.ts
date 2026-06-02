import { describe, it, expect, vi } from 'vitest';
import * as avatarApi from '../api/avatar';

vi.mock('../api/request', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({})),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

describe('avatar.ts', () => {
  describe('模块导出', () => {
    it('getConfig应该是函数', () => {
      expect(typeof avatarApi.getConfig).toBe('function');
    });

    it('updateConfig应该是函数', () => {
      expect(typeof avatarApi.updateConfig).toBe('function');
    });

    it('getVoices应该是函数', () => {
      expect(typeof avatarApi.getVoices).toBe('function');
    });

    it('previewVoice应该是函数', () => {
      expect(typeof avatarApi.previewVoice).toBe('function');
    });
  });

  describe('getConfig', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.getConfig();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('updateConfig', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.updateConfig({ name: '测试' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getVoices', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.getVoices();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('previewVoice', () => {
    it('应该返回Promise', () => {
      const result = avatarApi.previewVoice('voice-1');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
