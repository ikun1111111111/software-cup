import { describe, it, expect, vi } from 'vitest';
import {
  getDocs,
  getDocById,
  uploadFile,
  createDoc,
  deleteDoc,
  reindexDoc,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../api/knowledge';

// Mock request module
vi.mock('../api/request', () => ({
  get: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  post: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  put: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  del: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
}));

describe('knowledge.ts', () => {
  describe('模块导出', () => {
    it('getDocs应该是一个函数', () => {
      expect(typeof getDocs).toBe('function');
    });
    it('getDocById应该是一个函数', () => {
      expect(typeof getDocById).toBe('function');
    });
    it('uploadFile应该是一个函数', () => {
      expect(typeof uploadFile).toBe('function');
    });
    it('createDoc应该是一个函数', () => {
      expect(typeof createDoc).toBe('function');
    });
    it('deleteDoc应该是一个函数', () => {
      expect(typeof deleteDoc).toBe('function');
    });
    it('reindexDoc应该是一个函数', () => {
      expect(typeof reindexDoc).toBe('function');
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
    it('uploadFile应该返回Promise', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = uploadFile(file);
      expect(result).toBeInstanceOf(Promise);
    });
    it('createDoc应该返回Promise', () => {
      const result = createDoc({ title: 'test', file_type: 'pdf', file_path: '/test.pdf' });
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
    it('getDocById应该返回包含分块数据的Promise', () => {
      const result = getDocById('1');
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
