import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AvatarPage from '../pages/admin/AvatarPage';

// Mock DigitalHuman
vi.mock('../components/DigitalHuman/DigitalHuman', () => ({
  default: () => <div data-testid="digital-human-mock">DigitalHuman Preview</div>,
}));

describe('AvatarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<AvatarPage />);
      expect(screen.getByTestId('avatar-page')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<AvatarPage />);
      expect(screen.getByText('数字人配置')).toBeDefined();
    });

    it('应该显示保存按钮', () => {
      render(<AvatarPage />);
      expect(screen.getByText('保存配置')).toBeDefined();
    });

    it('应该显示预览区域', () => {
      render(<AvatarPage />);
      expect(screen.getByTestId('preview-area')).toBeDefined();
    });

    it('应该显示外观配置', () => {
      render(<AvatarPage />);
      expect(screen.getByTestId('appearance-section')).toBeDefined();
    });

    it('应该显示声音选择', () => {
      render(<AvatarPage />);
      fireEvent.click(screen.getByText('声音'));
      expect(screen.getByTestId('voice-section')).toBeDefined();
    });

    it('应该显示欢迎语编辑', () => {
      render(<AvatarPage />);
      fireEvent.click(screen.getByText('欢迎语'));
      expect(screen.getByTestId('welcome-section')).toBeDefined();
    });

    it('应该显示实时预览标题', () => {
      render(<AvatarPage />);
      expect(screen.getByText('实时预览')).toBeDefined();
    });

    it('应该渲染数字人预览组件', () => {
      render(<AvatarPage />);
      expect(screen.getByTestId('digital-human-mock')).toBeDefined();
    });
  });

  describe('保存功能', () => {
    it('点击保存应该显示保存中', () => {
      render(<AvatarPage />);

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      expect(screen.getByText('保存中...')).toBeDefined();
    });

    it('保存按钮应该禁用', () => {
      render(<AvatarPage />);

      const saveBtns = screen.getAllByTestId('save-btn');
      fireEvent.click(saveBtns[0]);

      expect(saveBtns[0]).toBeDisabled();
    });

    it('1秒后应该保存成功', () => {
      render(<AvatarPage />);

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('saved-msg')).toBeDefined();
      expect(screen.getByText('已保存')).toBeDefined();
    });

    it('保存后应该恢复按钮', () => {
      render(<AvatarPage />);

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('保存配置')).toBeDefined();
    });
  });
});
