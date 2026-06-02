import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DashboardPage from '../pages/admin/DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('dashboard-page')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<DashboardPage />);
      expect(screen.getByText('数据大屏')).toBeDefined();
    });

    it('应该渲染指标网格', () => {
      render(<DashboardPage />);
      const grids = screen.getAllByTestId('metrics-grid');
      expect(grids.length).toBeGreaterThanOrEqual(1);
    });

    it('应该显示今日访客', () => {
      render(<DashboardPage />);
      expect(screen.getByText('今日访客')).toBeDefined();
      expect(screen.getByText('12580')).toBeDefined();
    });

    it('应该显示活跃会话', () => {
      render(<DashboardPage />);
      expect(screen.getByText('活跃会话')).toBeDefined();
      expect(screen.getByText('156')).toBeDefined();
    });

    it('应该显示平均情感分', () => {
      render(<DashboardPage />);
      expect(screen.getByText('平均情感分')).toBeDefined();
      expect(screen.getByText('4.2')).toBeDefined();
    });

    it('应该显示满意度', () => {
      render(<DashboardPage />);
      expect(screen.getByText('满意度')).toBeDefined();
      expect(screen.getByText('92%')).toBeDefined();
    });
  });

  describe('子组件', () => {
    it('应该渲染实时监控', () => {
      render(<DashboardPage />);
      expect(screen.getByText('实时监控')).toBeDefined();
    });

    it('应该渲染热门问答', () => {
      render(<DashboardPage />);
      expect(screen.getByText('热门问答 Top10')).toBeDefined();
    });
  });
});
