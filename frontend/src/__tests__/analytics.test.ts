import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as analyticsApi from '../api/analytics';

vi.mock('../api/request', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({})),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

describe('analytics.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('模块导出', () => {
    it('getSentimentData应该是函数', () => {
      expect(typeof analyticsApi.getSentimentData).toBe('function');
    });

    it('getReport应该是函数', () => {
      expect(typeof analyticsApi.getReport).toBe('function');
    });

    it('getDashboardMetrics应该是函数', () => {
      expect(typeof analyticsApi.getDashboardMetrics).toBe('function');
    });

    it('getHotQuestions应该是函数', () => {
      expect(typeof analyticsApi.getHotQuestions).toBe('function');
    });

    it('subscribeRealtime应该是函数', () => {
      expect(typeof analyticsApi.subscribeRealtime).toBe('function');
    });
  });

  describe('getSentimentData', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getSentimentData();
      expect(result).toBeInstanceOf(Promise);
    });

    it('应该支持日期参数', () => {
      const result = analyticsApi.getSentimentData({ startDate: '2024-01-01', endDate: '2024-01-31' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getReport', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getReport();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getDashboardMetrics', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getDashboardMetrics();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getHotQuestions', () => {
    it('应该返回Promise', () => {
      const result = analyticsApi.getHotQuestions();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('subscribeRealtime', () => {
    it('应该返回取消订阅函数', () => {
      const unsubscribe = analyticsApi.subscribeRealtime(() => {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('应该定期调用回调', () => {
      const callback = vi.fn();
      analyticsApi.subscribeRealtime(callback);

      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('取消订阅后应该停止调用', () => {
      const callback = vi.fn();
      const unsubscribe = analyticsApi.subscribeRealtime(callback);

      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
