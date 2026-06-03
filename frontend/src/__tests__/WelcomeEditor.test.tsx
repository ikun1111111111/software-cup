import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WelcomeEditor from '../components/admin/WelcomeEditor';

describe('WelcomeEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('welcome-editor')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<WelcomeEditor />);
      expect(screen.getByText('欢迎语编辑')).toBeDefined();
    });

    it('应该渲染输入框', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('welcome-input')).toBeDefined();
    });

    it('应该渲染字数统计', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('char-count')).toBeDefined();
    });

    it('应该渲染预览按钮', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('preview-btn')).toBeDefined();
    });

    it('应该渲染保存按钮', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('save-btn')).toBeDefined();
    });

    it('应该显示初始字数', () => {
      render(<WelcomeEditor />);
      expect(screen.getByText('0/500')).toBeDefined();
    });
  });

  describe('输入', () => {
    it('应该支持输入文本', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input') as HTMLTextAreaElement;

      fireEvent.change(input, { target: { value: '欢迎来到灵山景区！' } });

      expect(input.value).toBe('欢迎来到灵山景区！');
    });

    it('应该更新字数统计', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });

      expect(screen.getByText('2/500')).toBeDefined();
    });

    it('应该调用onChange回调', () => {
      const onChange = vi.fn();
      render(<WelcomeEditor onChange={onChange} />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });

      expect(onChange).toHaveBeenCalledWith('测试');
    });

    it('应该限制最大长度', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input') as HTMLTextAreaElement;
      const longText = 'a'.repeat(501);

      fireEvent.change(input, { target: { value: longText } });

      expect(input.value.length).toBe(0);
    });
  });

  describe('预览', () => {
    it('空文本时预览按钮应该禁用', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('preview-btn')).toBeDisabled();
    });

    it('有文本时预览按钮应该启用', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });

      expect(screen.getByTestId('preview-btn')).not.toBeDisabled();
    });

    it('点击预览应该调用回调', () => {
      const onPreview = vi.fn();
      render(<WelcomeEditor onPreview={onPreview} />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });
      fireEvent.click(screen.getByTestId('preview-btn'));

      expect(onPreview).toHaveBeenCalledWith('测试');
    });

    it('预览时应该显示预览中', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });
      fireEvent.click(screen.getByTestId('preview-btn'));

      expect(screen.getByText('预览中...')).toBeDefined();
    });

    it('预览按钮应该禁用', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });
      fireEvent.click(screen.getByTestId('preview-btn'));

      expect(screen.getByTestId('preview-btn')).toBeDisabled();
    });

    it('3秒后应该恢复预览按钮', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });
      fireEvent.click(screen.getByTestId('preview-btn'));

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('preview-btn')).not.toBeDisabled();
      expect(screen.getByText('预览')).toBeDefined();
    });
  });

  describe('保存', () => {
    it('空文本时保存按钮应该禁用', () => {
      render(<WelcomeEditor />);
      expect(screen.getByTestId('save-btn')).toBeDisabled();
    });

    it('有文本时保存按钮应该启用', () => {
      render(<WelcomeEditor />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });

      expect(screen.getByTestId('save-btn')).not.toBeDisabled();
    });

    it('点击保存应该调用回调', () => {
      const onSave = vi.fn();
      render(<WelcomeEditor onSave={onSave} />);
      const input = screen.getByTestId('welcome-input');

      fireEvent.change(input, { target: { value: '测试' } });
      fireEvent.click(screen.getByTestId('save-btn'));

      expect(onSave).toHaveBeenCalledWith('测试');
    });
  });

  describe('初始数据', () => {
    it('应该加载初始欢迎语', () => {
      render(<WelcomeEditor welcome="初始欢迎语" />);

      const input = screen.getByTestId('welcome-input') as HTMLTextAreaElement;
      expect(input.value).toBe('初始欢迎语');
      expect(screen.getByText('5/500')).toBeDefined();
    });
  });
});
