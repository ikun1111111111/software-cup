import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Mock antd
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import request, { get, post, put, del } from '../api/request';

describe('request.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('模块初始化', () => {
    it('应该创建axios实例', () => {
      // request模块导入时会调用axios.create
      expect(request).toBeDefined();
    });
  });

  describe('请求方法', () => {
    it('get方法应该存在', () => {
      expect(typeof get).toBe('function');
    });

    it('post方法应该存在', () => {
      expect(typeof post).toBe('function');
    });

    it('put方法应该存在', () => {
      expect(typeof put).toBe('function');
    });

    it('del方法应该存在', () => {
      expect(typeof del).toBe('function');
    });
  });

  describe('功能验证', () => {
    it('request应该是一个对象', () => {
      expect(typeof request).toBe('object');
    });

    it('request应该有get方法', () => {
      expect(request.get).toBeDefined();
    });

    it('request应该有post方法', () => {
      expect(request.post).toBeDefined();
    });

    it('request应该有put方法', () => {
      expect(request.put).toBeDefined();
    });

    it('request应该有delete方法', () => {
      expect(request.delete).toBeDefined();
    });
  });
});
