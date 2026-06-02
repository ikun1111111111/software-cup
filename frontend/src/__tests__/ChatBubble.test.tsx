import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatBubble from '../components/DigitalHuman/ChatBubble';
import { Message } from '../stores/chatStore';

describe('ChatBubble', () => {
  const baseMessage: Message = {
    id: '1',
    role: 'assistant',
    content: '你好，我是数字人导游',
    timestamp: new Date(2026, 5, 2, 10, 30).getTime(),
  };

  describe('渲染', () => {
    it('应该渲染消息内容', () => {
      render(<ChatBubble message={baseMessage} isUser={false} />);
      expect(screen.getByText('你好，我是数字人导游')).toBeDefined();
    });

    it('应该渲染用户消息', () => {
      const userMessage: Message = {
        ...baseMessage,
        role: 'user',
        content: '请问灵山大佛在哪里？',
      };
      render(<ChatBubble message={userMessage} isUser={true} />);
      expect(screen.getByText('请问灵山大佛在哪里？')).toBeDefined();
    });

    it('应该显示时间', () => {
      render(<ChatBubble message={baseMessage} isUser={false} />);
      expect(screen.getByText('10:30')).toBeDefined();
    });
  });

  describe('样式', () => {
    it('用户消息应该在右侧', () => {
      const { container } = render(
        <ChatBubble message={{ ...baseMessage, role: 'user' }} isUser={true} />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.style.flexDirection).toBe('row-reverse');
    });

    it('AI消息应该在左侧', () => {
      const { container } = render(
        <ChatBubble message={baseMessage} isUser={false} />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.style.flexDirection).toBe('row');
    });

    it('用户消息应该有蓝色背景', () => {
      const { container } = render(
        <ChatBubble message={{ ...baseMessage, role: 'user' }} isUser={true} />
      );
      const content = container.querySelector('[data-testid="chat-bubble"] > div > div') as HTMLElement;
      expect(content.style.backgroundColor).toBe('var(--color-primary)');
    });

    it('AI消息应该有白色背景', () => {
      const { container } = render(
        <ChatBubble message={baseMessage} isUser={false} />
      );
      const content = container.querySelector('[data-testid="chat-bubble"] > div > div') as HTMLElement;
      expect(content.style.backgroundColor).toBe('var(--surface-card)');
    });
  });

  describe('状态', () => {
    it('发送中状态应该显示提示', () => {
      const sendingMessage: Message = {
        ...baseMessage,
        status: 'sending',
      };
      render(<ChatBubble message={sendingMessage} isUser={false} />);
      expect(screen.getByText('发送中...')).toBeDefined();
    });

    it('错误状态应该显示失败提示', () => {
      const errorMessage: Message = {
        ...baseMessage,
        status: 'error',
      };
      render(<ChatBubble message={errorMessage} isUser={false} />);
      expect(screen.getByText('发送失败')).toBeDefined();
    });

    it('已发送状态不应该显示状态提示', () => {
      const sentMessage: Message = {
        ...baseMessage,
        status: 'sent',
      };
      const { container } = render(<ChatBubble message={sentMessage} isUser={false} />);
      expect(container.textContent).not.toContain('发送中');
      expect(container.textContent).not.toContain('发送失败');
    });
  });

  describe('换行', () => {
    it('应该正确渲染换行符', () => {
      const multilineMessage: Message = {
        ...baseMessage,
        content: '第一行\n第二行\n第三行',
      };
      const { container } = render(
        <ChatBubble message={multilineMessage} isUser={false} />
      );
      const brElements = container.querySelectorAll('br');
      expect(brElements.length).toBe(2);
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      const emptyMessage: Message = {
        ...baseMessage,
        content: '',
      };
      const { container } = render(
        <ChatBubble message={emptyMessage} isUser={false} />
      );
      expect(container).toBeDefined();
    });

    it('应该处理超长消息', () => {
      const longMessage: Message = {
        ...baseMessage,
        content: 'A'.repeat(1000),
      };
      const { container } = render(
        <ChatBubble message={longMessage} isUser={false} />
      );
      expect(container.textContent).toContain('A');
    });
  });
});
