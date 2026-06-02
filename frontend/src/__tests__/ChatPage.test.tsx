import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPage from '../pages/tourist/ChatPage';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock chatStore
const mockAddMessage = vi.fn();
const mockUpdateMessage = vi.fn();
const mockSetStreaming = vi.fn();
const mockSetCurrentSession = vi.fn();
const mockSetError = vi.fn();

vi.mock('../stores/chatStore', () => ({
  useChatStore: () => ({
    messages: [],
    currentSessionId: null,
    isStreaming: false,
    error: null,
    addMessage: mockAddMessage,
    updateMessage: mockUpdateMessage,
    setStreaming: mockSetStreaming,
    setCurrentSession: mockSetCurrentSession,
    setError: mockSetError,
  }),
}));

// Mock useSSE
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('../hooks/useSSE', () => ({
  useSSE: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    isConnected: false,
    error: null,
  }),
}));

// Mock ChatBubble
vi.mock('../components/DigitalHuman/ChatBubble', () => ({
  default: ({ message, isUser }: any) => (
    <div data-testid={`bubble-${message.id}`}>
      {isUser ? '用户' : 'AI'}: {message.content}
    </div>
  ),
}));

// Mock VoiceInput
vi.mock('../components/DigitalHuman/VoiceInput', () => ({
  default: ({ onSend }: any) => (
    <button data-testid="voice-input" onClick={() => onSend(new Blob(['test']))}>
      语音
    </button>
  ),
}));

// Mock DigitalHuman
vi.mock('../components/DigitalHuman/DigitalHuman', () => ({
  default: () => <div data-testid="digital-human-mock">DigitalHuman</div>,
}));

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('chat-page')).toBeDefined();
    });

    it('应该显示欢迎消息', () => {
      render(<ChatPage />);
      expect(screen.getByText(/你好！我是灵山胜境数字人导游/)).toBeDefined();
    });

    it('应该渲染消息列表', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('message-list')).toBeDefined();
    });

    it('应该渲染输入区域', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('input-area')).toBeDefined();
    });

    it('应该渲染数字人组件', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('digital-human-mock')).toBeDefined();
    });
  });

  describe('输入', () => {
    it('应该渲染文本输入框', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('text-input')).toBeDefined();
    });

    it('应该渲染发送按钮', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('send-button')).toBeDefined();
    });

    it('应该渲染语音输入', () => {
      render(<ChatPage />);
      expect(screen.getByTestId('voice-input')).toBeDefined();
    });

    it('输入框应该有占位文本', () => {
      render(<ChatPage />);
      expect(screen.getByPlaceholderText('输入消息...')).toBeDefined();
    });
  });

  describe('发送消息', () => {
    it('点击发送按钮应该添加消息', () => {
      render(<ChatPage />);
      const input = screen.getByPlaceholderText('输入消息...');
      const sendButton = screen.getByTestId('send-button');

      fireEvent.change(input, { target: { value: '你好' } });
      fireEvent.click(sendButton);

      expect(mockAddMessage).toHaveBeenCalledTimes(2);
    });

    it('空消息不应该发送', () => {
      render(<ChatPage />);
      const sendButton = screen.getByTestId('send-button');

      fireEvent.click(sendButton);

      expect(mockAddMessage).not.toHaveBeenCalled();
    });
  });

  describe('语音输入', () => {
    it('点击语音按钮应该发送音频', () => {
      render(<ChatPage />);
      const voiceButton = screen.getByTestId('voice-input');

      fireEvent.click(voiceButton);

      expect(mockAddMessage).toHaveBeenCalled();
    });
  });

  describe('初始化', () => {
    it('应该初始化会话ID', () => {
      render(<ChatPage />);
      expect(mockSetCurrentSession).toHaveBeenCalled();
    });
  });
});
