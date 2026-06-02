import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ReportPage from '../pages/admin/ReportPage';

describe('ReportPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: '',
    })) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<ReportPage />);
      expect(screen.getByTestId('report-page')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<ReportPage />);
      expect(screen.getByText('灵山景区感受度报告')).toBeDefined();
    });

    it('应该显示日期', () => {
      render(<ReportPage />);
      expect(screen.getByText('2024年1月')).toBeDefined();
    });

    it('应该显示导出按钮', () => {
      render(<ReportPage />);
      expect(screen.getByTestId('export-btn')).toBeDefined();
    });

    it('应该显示摘要', () => {
      render(<ReportPage />);
      expect(screen.getByTestId('summary-section')).toBeDefined();
    });

    it('应该显示盲区发现', () => {
      render(<ReportPage />);
      expect(screen.getByTestId('blind-spots')).toBeDefined();
    });

    it('应该显示服务建议', () => {
      render(<ReportPage />);
      expect(screen.getByTestId('suggestions')).toBeDefined();
    });
  });

  describe('导出功能', () => {
    it('点击导出应该显示导出中', () => {
      render(<ReportPage />);

      fireEvent.click(screen.getByTestId('export-btn'));

      expect(screen.getByText('导出中...')).toBeDefined();
    });

    it('导出按钮应该禁用', () => {
      render(<ReportPage />);

      fireEvent.click(screen.getByTestId('export-btn'));

      expect(screen.getByTestId('export-btn')).toBeDisabled();
    });

    it('2秒后应该恢复按钮', () => {
      render(<ReportPage />);

      fireEvent.click(screen.getByTestId('export-btn'));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('导出报告')).toBeDefined();
    });
  });
});
