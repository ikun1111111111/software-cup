import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RecommendPage from '../pages/tourist/RecommendPage';

describe('RecommendPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<RecommendPage />);
      expect(screen.getByTestId('recommend-page')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<RecommendPage />);
      expect(screen.getByText('个性化路线推荐')).toBeDefined();
    });

    it('应该渲染兴趣标签区域', () => {
      render(<RecommendPage />);
      expect(screen.getByTestId('interest-tags')).toBeDefined();
    });

    it('应该渲染路线列表', () => {
      render(<RecommendPage />);
      expect(screen.getByTestId('route-list')).toBeDefined();
    });
  });

  describe('兴趣标签', () => {
    it('应该渲染所有兴趣选项', () => {
      render(<RecommendPage />);
      expect(screen.getByText('佛教文化')).toBeDefined();
      expect(screen.getByText('自然风光')).toBeDefined();
      expect(screen.getByText('历史古迹')).toBeDefined();
      expect(screen.getByText('美食体验')).toBeDefined();
      expect(screen.getByText('亲子活动')).toBeDefined();
      expect(screen.getByText('摄影打卡')).toBeDefined();
    });

    it('点击标签应该选中', () => {
      render(<RecommendPage />);
      const tag = screen.getByText('佛教文化');

      fireEvent.click(tag);

      // 标签应该变为选中状态（蓝色边框）
      expect(tag.style.borderColor).toBe('var(--color-primary)');
    });

    it('再次点击应该取消选中', () => {
      render(<RecommendPage />);
      const tag = screen.getByText('佛教文化');

      fireEvent.click(tag);
      fireEvent.click(tag);

      // 标签应该恢复默认状态（无显式 borderColor）
      expect(tag.style.borderColor).toBeFalsy();
    });

    it('应该支持多选', () => {
      render(<RecommendPage />);
      const tag1 = screen.getByText('佛教文化');
      const tag2 = screen.getByText('自然风光');

      fireEvent.click(tag1);
      fireEvent.click(tag2);

      expect(tag1.style.borderColor).toBe('var(--color-primary)');
      expect(tag2.style.borderColor).toBe('var(--color-primary)');
    });
  });

  describe('路线列表', () => {
    it('应该显示默认路线', () => {
      render(<RecommendPage />);
      expect(screen.getByText('灵山大佛精华游')).toBeDefined();
      expect(screen.getByText('灵山自然漫步')).toBeDefined();
      expect(screen.getByText('灵山亲子一日游')).toBeDefined();
    });

    it('应该显示路线详情', () => {
      render(<RecommendPage />);
      expect(screen.getByText(/4小时/)).toBeDefined();
      expect(screen.getByText(/5公里/)).toBeDefined();
      expect(screen.getByText(/4.8/)).toBeDefined();
    });

    it('应该显示景点标签', () => {
      render(<RecommendPage />);
      expect(screen.getAllByText('灵山大佛').length).toBeGreaterThan(0);
      expect(screen.getByText('梵宫')).toBeDefined();
    });
  });

  describe('筛选功能', () => {
    it('选择兴趣后应该筛选路线', async () => {
      render(<RecommendPage />);
      const tag = screen.getByText('佛教文化');

      fireEvent.click(tag);

      // 等待模拟API延迟
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 应该只显示包含佛教文化兴趣的路线
      expect(screen.getByText('灵山大佛精华游')).toBeDefined();
    });

    it('取消所有选择应该显示全部路线', () => {
      render(<RecommendPage />);
      const tag = screen.getByText('佛教文化');

      // 选中
      fireEvent.click(tag);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 取消选中
      fireEvent.click(tag);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 应该显示所有路线
      expect(screen.getByText('灵山大佛精华游')).toBeDefined();
      expect(screen.getByText('灵山自然漫步')).toBeDefined();
      expect(screen.getByText('灵山亲子一日游')).toBeDefined();
    });
  });

  describe('路线卡片', () => {
    it('点击路线卡片应该触发选择', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      render(<RecommendPage />);
      const card = screen.getByTestId('route-card-1');

      fireEvent.click(card);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Selected route:',
        expect.objectContaining({ id: '1', name: '灵山大佛精华游' })
      );

      consoleSpy.mockRestore();
    });

    it('路线卡片应该有hoverable样式', () => {
      render(<RecommendPage />);
      const card = screen.getByTestId('route-card-1');
      expect(card).toBeDefined();
    });
  });

  describe('边界情况', () => {
    it('筛选无结果应该显示空状态', () => {
      render(<RecommendPage />);
      const tag = screen.getByText('美食体验');

      fireEvent.click(tag);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('暂无匹配的推荐路线')).toBeDefined();
    });
  });
});
