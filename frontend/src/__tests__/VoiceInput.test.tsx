import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceInput from '../components/DigitalHuman/VoiceInput';

// Mock useVoiceRecord
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockGetAudioBlob = vi.fn();

vi.mock('../hooks/useVoiceRecord', () => ({
  useVoiceRecord: () => ({
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    getAudioBlob: mockGetAudioBlob,
    isRecording: false,
    error: null,
  }),
}));

describe('VoiceInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染语音按钮', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      expect(screen.getByTestId('voice-button')).toBeDefined();
    });

    it('应该显示麦克风图标', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');
      expect(button.querySelector('span[role="img"]')).toBeDefined();
    });

    it('应该渲染容器', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      expect(screen.getByTestId('voice-input')).toBeDefined();
    });
  });

  describe('长按检测', () => {
    it('按下按钮应该开始计时', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);

      // 300ms内不应该开始录音
      expect(mockStartRecording).not.toHaveBeenCalled();
    });

    it('长按300ms后应该调用startRecording', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it('短按不应该调用startRecording', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      fireEvent.mouseUp(button);

      expect(mockStartRecording).not.toHaveBeenCalled();
    });
  });

  describe('按钮交互', () => {
    it('按下按钮应该改变样式', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);

      expect(button.style.backgroundColor).toBe('var(--color-primary-light)');
    });

    it('松开按钮应该恢复样式', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);

      expect(button.style.backgroundColor).toBe('var(--color-primary)');
    });

    it('按钮应该有圆形样式', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      expect(button.style.borderRadius).toBe('50%');
      expect(button.style.width).toBe('44px');
      expect(button.style.height).toBe('44px');
    });
  });

  describe('触摸事件', () => {
    it('触摸应该触发长按检测', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.touchStart(button);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it('短触摸不应该触发录音', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.touchStart(button);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      fireEvent.touchEnd(button);

      expect(mockStartRecording).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('快速点击不应该触发录音', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);

      expect(mockStartRecording).not.toHaveBeenCalled();
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('多次快速点击不应该累积计时器', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);
      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);

      expect(mockStartRecording).not.toHaveBeenCalled();
    });

    it('鼠标离开应该取消长按', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      const button = screen.getByTestId('voice-button');

      fireEvent.mouseDown(button);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      fireEvent.mouseLeave(button);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockStartRecording).not.toHaveBeenCalled();
    });
  });

  describe('语速控制', () => {
    it('点击设置按钮应该显示语速滑块', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      fireEvent.click(screen.getByTestId('voice-settings-btn'));
      expect(screen.getByTestId('speed-control')).toBeDefined();
      expect(screen.getByTestId('speed-slider')).toBeDefined();
    });

    it('默认语速应该是1.0', () => {
      render(<VoiceInput onSend={mockOnSend} />);
      fireEvent.click(screen.getByTestId('voice-settings-btn'));
      expect(screen.getByTestId('speed-value').textContent).toBe('1.0x');
    });

    it('改变语速应该调用onSpeedChange', () => {
      const onSpeedChange = vi.fn();
      render(<VoiceInput onSend={mockOnSend} onSpeedChange={onSpeedChange} />);
      fireEvent.click(screen.getByTestId('voice-settings-btn'));
      fireEvent.change(screen.getByTestId('speed-slider'), { target: { value: '1.5' } });
      expect(onSpeedChange).toHaveBeenCalledWith(1.5);
    });
  });

  describe('打断功能', () => {
    it('按下按钮时应该调用onInterrupt', () => {
      const onInterrupt = vi.fn();
      render(<VoiceInput onSend={mockOnSend} onInterrupt={onInterrupt} />);
      fireEvent.mouseDown(screen.getByTestId('voice-button'));
      expect(onInterrupt).toHaveBeenCalled();
    });
  });
});
