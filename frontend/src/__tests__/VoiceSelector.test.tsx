import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceSelector from '../components/admin/VoiceSelector';

describe('VoiceSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<VoiceSelector />);
      expect(screen.getByTestId('voice-selector')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<VoiceSelector />);
      expect(screen.getByText('声音选择')).toBeDefined();
    });

    it('应该渲染声音列表', () => {
      render(<VoiceSelector />);
      expect(screen.getByTestId('voice-list')).toBeDefined();
    });

    it('应该显示默认声音', () => {
      render(<VoiceSelector />);
      expect(screen.getByText('甜美女声')).toBeDefined();
      expect(screen.getByText('沉稳男声')).toBeDefined();
      expect(screen.getByText('活泼女声')).toBeDefined();
      expect(screen.getByText('磁性男声')).toBeDefined();
    });

    it('应该显示语言和性别', () => {
      render(<VoiceSelector />);
      const femaleVoices = screen.getAllByText(/中文 \| 女/);
      expect(femaleVoices.length).toBeGreaterThanOrEqual(1);
      const maleVoices = screen.getAllByText(/中文 \| 男/);
      expect(maleVoices.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/英文 \| 男/)).toBeDefined();
    });

    it('应该显示试听按钮', () => {
      render(<VoiceSelector />);
      expect(screen.getByTestId('preview-voice-1')).toBeDefined();
      expect(screen.getByTestId('preview-voice-2')).toBeDefined();
    });
  });

  describe('声音选择', () => {
    it('点击声音应该选中', () => {
      const onChange = vi.fn();
      render(<VoiceSelector onChange={onChange} />);

      fireEvent.click(screen.getByTestId('voice-voice-2'));

      expect(onChange).toHaveBeenCalledWith('voice-2');
    });

    it('选中的声音应该高亮', () => {
      render(<VoiceSelector selected="voice-2" />);

      const voiceItem = screen.getByTestId('voice-voice-2');
      expect(voiceItem.style.border).toBe('1.5px solid rgb(26, 95, 180)');
      expect(voiceItem.style.backgroundColor).toBe('rgb(232, 240, 254)');
    });

    it('未选中的声音不应该高亮', () => {
      render(<VoiceSelector selected="voice-2" />);

      const voiceItem = screen.getByTestId('voice-voice-1');
      expect(voiceItem.style.border).toBe('1px solid rgb(232, 229, 223)');
    });
  });

  describe('声音预览', () => {
    it('点击试听应该调用回调', () => {
      const onPreview = vi.fn();
      render(<VoiceSelector onPreview={onPreview} />);

      fireEvent.click(screen.getByTestId('preview-voice-1'));

      expect(onPreview).toHaveBeenCalledWith('voice-1');
    });

    it('试听时应该显示播放中', () => {
      render(<VoiceSelector />);

      fireEvent.click(screen.getByTestId('preview-voice-1'));

      expect(screen.getByText('播放中...')).toBeDefined();
    });

    it('试听按钮应该禁用', () => {
      render(<VoiceSelector />);

      fireEvent.click(screen.getByTestId('preview-voice-1'));

      expect(screen.getByTestId('preview-voice-1')).toBeDisabled();
    });

    it('2秒后应该恢复试听按钮', () => {
      render(<VoiceSelector />);

      fireEvent.click(screen.getByTestId('preview-voice-1'));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('preview-voice-1')).not.toBeDisabled();
      const previewButtons = screen.getAllByText('试听');
      expect(previewButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('自定义数据', () => {
    it('应该支持自定义声音列表', () => {
      const customVoices = [
        { id: 'custom-1', name: '自定义声音', language: '日文', gender: '女', previewUrl: '' },
      ];
      render(<VoiceSelector voices={customVoices} />);

      expect(screen.getByText('自定义声音')).toBeDefined();
      expect(screen.getByText(/日文 | 女/)).toBeDefined();
    });
  });
});
