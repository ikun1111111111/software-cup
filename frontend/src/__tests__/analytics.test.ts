import { describe, it, expect, vi } from 'vitest';
import * as analyticsApi from '../api/analytics';

vi.mock('../api/request', () => ({
  get: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
  post: vi.fn(() => Promise.resolve({ data: { code: 200, data: {} } })),
}));

describe('analytics.ts', () => {
  describe('模块导出', () => {
    it('getTrends应该是函数', () => {
      expect(typeof analyticsApi.getTrends).toBe('function');
    });
    it('getTopQuestions应该是函数', () => {
      expect(typeof analyticsApi.getTopQuestions).toBe('function');
    });
    it('getOverview应该是函数', () => {
      expect(typeof analyticsApi.getOverview).toBe('function');
    });
    it('triggerReport应该是函数', () => {
      expect(typeof analyticsApi.triggerReport).toBe('function');
    });
    it('getReportStatus应该是函数', () => {
      expect(typeof analyticsApi.getReportStatus).toBe('function');
    });
  });

  describe('getTrends', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getTrends();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getTopQuestions', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getTopQuestions();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('triggerReport', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.triggerReport();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getReportStatus', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getReportStatus('task-123');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
