import { describe, it, expect, vi } from 'vitest';
import {
  getDocs,
  getDocById,
  uploadDoc,
  deleteDoc,
  reindexDoc,
  getChunks,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../api/knowledge';

// Mock request module
vi.mock('../api/request', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    del: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('knowledge.ts', () => {
  describe('模块导出', () => {
    it('getDocs应该是一个函数', () => {
      expect(typeof getDocs).toBe('function');
    });

    it('getDocById应该是一个函数', () => {
      expect(typeof getDocById).toBe('function');
    });

    it('uploadDoc应该是一个函数', () => {
      expect(typeof uploadDoc).toBe('function');
    });

    it('deleteDoc应该是一个函数', () => {
      expect(typeof deleteDoc).toBe('function');
    });

    it('reindexDoc应该是一个函数', () => {
      expect(typeof reindexDoc).toBe('function');
    });

    it('getChunks应该是一个函数', () => {
      expect(typeof getChunks).toBe('function');
    });

    it('getFAQs应该是一个函数', () => {
      expect(typeof getFAQs).toBe('function');
    });

    it('createFAQ应该是一个函数', () => {
      expect(typeof createFAQ).toBe('function');
    });

    it('updateFAQ应该是一个函数', () => {
      expect(typeof updateFAQ).toBe('function');
    });

    it('deleteFAQ应该是一个函数', () => {
      expect(typeof deleteFAQ).toBe('function');
    });
  });

  describe('文档API', () => {
    it('getDocs应该返回Promise', () => {
      const result = getDocs();
      expect(result).toBeInstanceOf(Promise);
    });

    it('getDocById应该返回Promise', () => {
      const result = getDocById('1');
      expect(result).toBeInstanceOf(Promise);
    });

    it('uploadDoc应该返回Promise', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = uploadDoc(file);
      expect(result).toBeInstanceOf(Promise);
    });

    it('deleteDoc应该返回Promise', () => {
      const result = deleteDoc('1');
      expect(result).toBeInstanceOf(Promise);
    });

    it('reindexDoc应该返回Promise', () => {
      const result = reindexDoc('1');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('分块API', () => {
    it('getChunks应该返回Promise', () => {
      const result = getChunks('1');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('FAQ API', () => {
    it('getFAQs应该返回Promise', () => {
      const result = getFAQs();
      expect(result).toBeInstanceOf(Promise);
    });

    it('createFAQ应该返回Promise', () => {
      const result = createFAQ({
        question: '测试问题',
        answer: '测试答案',
        keywords: ['测试'],
        category: '通用',
      });
      expect(result).toBeInstanceOf(Promise);
    });

    it('updateFAQ应该返回Promise', () => {
      const result = updateFAQ('1', { question: '更新问题' });
      expect(result).toBeInstanceOf(Promise);
    });

    it('deleteFAQ应该返回Promise', () => {
      const result = deleteFAQ('1');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
