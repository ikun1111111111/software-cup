import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingAssistant from '../components/DigitalHuman/FloatingAssistant';

describe('FloatingAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('初始状态应该显示悬浮球', () => {
      render(<FloatingAssistant />);
      expect(screen.getByTestId('floating-assistant-ball')).toBeDefined();
    });

    it('初始状态不应该显示面板', () => {
      render(<FloatingAssistant />);
      expect(screen.queryByTestId('floating-assistant-panel')).toBeNull();
    });
  });

  describe('展开/收起', () => {
    it('点击悬浮球应该展开面板', () => {
      render(<FloatingAssistant />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      expect(screen.getByTestId('floating-assistant-panel')).toBeDefined();
    });

    it('点击关闭按钮应该收起面板', () => {
      render(<FloatingAssistant />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      expect(screen.getByTestId('floating-assistant-panel')).toBeDefined();

      fireEvent.click(screen.getByLabelText('关闭'));
      expect(screen.queryByTestId('floating-assistant-panel')).toBeNull();
    });

    it('应该调用onToggle回调', () => {
      const onToggle = vi.fn();
      render(<FloatingAssistant onToggle={onToggle} />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('消息显示', () => {
    it('无消息时应该显示欢迎语', () => {
      render(<FloatingAssistant />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      expect(screen.getByText(/你好.*数字导览员/)).toBeDefined();
    });

    it('有消息时应该显示消息列表', () => {
      const messages = [
        { role: 'user' as const, content: '灵山大佛多高？' },
        { role: 'assistant' as const, content: '灵山大佛高88米。' },
      ];
      render(<FloatingAssistant messages={messages} />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      expect(screen.getByText('灵山大佛多高？')).toBeDefined();
      expect(screen.getByText('灵山大佛高88米。')).toBeDefined();
    });
  });

  describe('消息发送', () => {
    it('输入文本后按Enter应该调用onSend', () => {
      const onSend = vi.fn();
      render(<FloatingAssistant onSend={onSend} />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));

      const input = screen.getByTestId('assistant-input');
      fireEvent.change(input, { target: { value: '灵山大佛多高？' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSend).toHaveBeenCalledWith('灵山大佛多高？');
    });

    it('空文本不应该调用onSend', () => {
      const onSend = vi.fn();
      render(<FloatingAssistant onSend={onSend} />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));

      const input = screen.getByTestId('assistant-input');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('新消息提示', () => {
    it('收起状态收到新消息应该显示红点', () => {
      const { rerender } = render(<FloatingAssistant messages={[]} />);
      rerender(<FloatingAssistant messages={[{ role: 'assistant', content: '新消息' }]} />);
      expect(screen.getByTestId('floating-assistant-ball')).toBeDefined();
    });
  });

  describe('语音按钮', () => {
    it('点击语音按钮应该调用onVoiceStart', () => {
      const onVoiceStart = vi.fn();
      render(<FloatingAssistant onVoiceStart={onVoiceStart} />);
      fireEvent.mouseDown(screen.getByTestId('floating-assistant-ball'));
      fireEvent.mouseUp(screen.getByTestId('floating-assistant-ball'));
      fireEvent.click(screen.getByTestId('assistant-voice-btn'));
      expect(onVoiceStart).toHaveBeenCalled();
    });
  });
});
