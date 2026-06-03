import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import EmotionController from '../components/DigitalHuman/EmotionController';

describe('EmotionController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染为null（逻辑组件）', () => {
      const { container } = render(<EmotionController />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('情感映射', () => {
    it('positive应该映射到happy', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="positive" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('happy');
    });

    it('negative应该映射到sad', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="negative" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('sad');
    });

    it('neutral应该映射到default', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="neutral" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('default');
    });

    it('surprised应该映射到surprised', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="surprised" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('surprised');
    });

    it('thinking应该映射到thinking', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="thinking" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('thinking');
    });
  });

  describe('回调函数', () => {
    it('emotion变化时应该调用onExpressionChange', () => {
      const onExpressionChange = vi.fn();
      render(<EmotionController emotion="positive" onExpressionChange={onExpressionChange} />);
      expect(onExpressionChange).toHaveBeenCalledWith('happy');
    });
  });

  describe('自动重置', () => {
    it('autoReset为true时应该在延迟后重置', () => {
      const onExpressionChange = vi.fn();
      render(
        <EmotionController
          emotion="positive"
          autoReset={true}
          resetDelay={3000}
          onExpressionChange={onExpressionChange}
        />
      );

      expect(onExpressionChange).toHaveBeenCalledWith('happy');

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onExpressionChange).toHaveBeenCalledWith('default');
    });

    it('autoReset为false时不应该自动重置', () => {
      const onExpressionChange = vi.fn();
      render(
        <EmotionController
          emotion="positive"
          autoReset={false}
          onExpressionChange={onExpressionChange}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onExpressionChange).toHaveBeenCalledTimes(1);
      expect(onExpressionChange).toHaveBeenCalledWith('happy');
    });

    it('emotion为neutral时不应该触发自动重置', () => {
      const onExpressionChange = vi.fn();
      render(
        <EmotionController
          emotion="neutral"
          autoReset={true}
          onExpressionChange={onExpressionChange}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onExpressionChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('emotion变化', () => {
    it('emotion变化时应该更新expression', () => {
      const onExpressionChange = vi.fn();
      const { rerender } = render(
        <EmotionController emotion="neutral" onExpressionChange={onExpressionChange} />
      );

      expect(onExpressionChange).toHaveBeenCalledWith('default');

      rerender(<EmotionController emotion="positive" onExpressionChange={onExpressionChange} />);

      expect(onExpressionChange).toHaveBeenCalledWith('happy');
    });
  });
});
