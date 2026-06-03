import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotQuestions from '../components/admin/HotQuestions';

describe('HotQuestions', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<HotQuestions />);
      expect(screen.getByTestId('hot-questions')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<HotQuestions />);
      expect(screen.getByText('热门问答 Top10')).toBeDefined();
    });

    it('应该渲染问题列表', () => {
      render(<HotQuestions />);
      expect(screen.getByTestId('questions-list')).toBeDefined();
    });

    it('应该显示默认问题', () => {
      render(<HotQuestions />);
      expect(screen.getByText('灵山大佛有多高？')).toBeDefined();
      expect(screen.getByText('景区开放时间是什么？')).toBeDefined();
    });
  });

  describe('问题列表', () => {
    it('应该显示排名', () => {
      render(<HotQuestions />);
      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
    });

    it('应该显示提问次数', () => {
      render(<HotQuestions />);
      expect(screen.getByText('156次')).toBeDefined();
      expect(screen.getByText('132次')).toBeDefined();
    });

    it('应该显示趋势', () => {
      render(<HotQuestions />);
      const upArrows = screen.getAllByText('↑');
      expect(upArrows.length).toBeGreaterThanOrEqual(1);
      const stableArrows = screen.getAllByText('→');
      expect(stableArrows.length).toBeGreaterThanOrEqual(1);
    });

    it('应该支持自定义数据', () => {
      const customQuestions = [
        { id: '1', question: '自定义问题', count: 10, trend: 'up' as const },
      ];
      render(<HotQuestions questions={customQuestions} />);
      expect(screen.getByText('自定义问题')).toBeDefined();
    });
  });

  describe('交互', () => {
    it('点击问题应该调用回调', () => {
      const onQuestionClick = vi.fn();
      render(<HotQuestions onQuestionClick={onQuestionClick} />);

      fireEvent.click(screen.getByTestId('question-1'));

      expect(onQuestionClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });

    it('没有回调时点击不应该报错', () => {
      render(<HotQuestions />);

      fireEvent.click(screen.getByTestId('question-1'));
    });
  });
});
