import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WordCloud from '../components/admin/WordCloud';

describe('WordCloud', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<WordCloud />);
      expect(screen.getByTestId('word-cloud')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<WordCloud />);
      expect(screen.getByText('关注点词云')).toBeDefined();
    });

    it('应该渲染词云容器', () => {
      render(<WordCloud />);
      expect(screen.getByTestId('cloud-container')).toBeDefined();
    });

    it('应该显示默认词语', () => {
      render(<WordCloud />);
      expect(screen.getByText('灵山大佛')).toBeDefined();
      expect(screen.getByText('梵宫')).toBeDefined();
      expect(screen.getByText('九龙灌浴')).toBeDefined();
    });
  });

  describe('词语展示', () => {
    it('应该根据词频设置大小', () => {
      render(<WordCloud />);
      const word = screen.getByTestId('word-灵山大佛');
      expect(word.style.fontSize).toBeDefined();
    });

    it('应该支持自定义词语', () => {
      const customWords = [
        { text: '自定义词', value: 50 },
      ];
      render(<WordCloud words={customWords} />);
      expect(screen.getByText('自定义词')).toBeDefined();
    });
  });

  describe('交互', () => {
    it('点击词语应该调用回调', () => {
      const onWordClick = vi.fn();
      render(<WordCloud onWordClick={onWordClick} />);

      fireEvent.click(screen.getByTestId('word-灵山大佛'));

      expect(onWordClick).toHaveBeenCalledWith('灵山大佛');
    });

    it('没有回调时点击不应该报错', () => {
      render(<WordCloud />);

      fireEvent.click(screen.getByTestId('word-灵山大佛'));
    });
  });
});
