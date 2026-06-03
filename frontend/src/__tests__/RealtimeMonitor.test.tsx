import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import RealtimeMonitor from '../components/admin/RealtimeMonitor';

describe('RealtimeMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('realtime-monitor')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByText('实时监控')).toBeDefined();
    });

    it('应该显示连接状态', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('connection-status')).toBeDefined();
    });

    it('应该渲染指标网格', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('metrics-grid')).toBeDefined();
    });

    it('应该显示活跃用户', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('metric-active-users')).toBeDefined();
    });

    it('应该显示消息数', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('metric-messages')).toBeDefined();
    });

    it('应该显示响应时间', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('metric-response-time')).toBeDefined();
    });

    it('应该显示情感分数', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByTestId('metric-sentiment')).toBeDefined();
    });
  });

  describe('连接状态', () => {
    it('初始应该显示未连接', () => {
      render(<RealtimeMonitor />);
      expect(screen.getByText('未连接')).toBeDefined();
    });

    it('1秒后应该显示已连接', () => {
      render(<RealtimeMonitor />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('已连接')).toBeDefined();
    });

    it('应该调用onConnect回调', () => {
      const onConnect = vi.fn();
      render(<RealtimeMonitor onConnect={onConnect} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onConnect).toHaveBeenCalled();
    });
  });

  describe('数据展示', () => {
    it('应该显示初始数据', () => {
      const data = {
        activeUsers: 50,
        messagesPerMinute: 25,
        avgResponseTime: 100,
        sentimentScore: 0.85,
      };
      render(<RealtimeMonitor data={data} />);

      expect(screen.getByText('50')).toBeDefined();
      expect(screen.getByText('25')).toBeDefined();
      expect(screen.getByText('100')).toBeDefined();
      expect(screen.getByText('0.85')).toBeDefined();
    });
  });
});
