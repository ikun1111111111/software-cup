import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore, Message } from '../stores/chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // 重置store状态
    useChatStore.setState({
      messages: [],
      currentSessionId: null,
      isStreaming: false,
      error: null,
    });
  });
});

  describe('初始状态', () => {
    it('应该有空消息列表', () => {
      const { messages } = useChatStore.getState();
      expect(messages).toEqual([]);
    });

    it('应该没有当前会话ID', () => {
      const { currentSessionId } = useChatStore.getState();
      expect(currentSessionId).toBeNull();
    });

    it('应该不是流式状态', () => {
      const { isStreaming } = useChatStore.getState();
      expect(isStreaming).toBe(false);
    });

    it('应该没有错误', () => {
      const { error } = useChatStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('应该添加消息到列表', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: '你好',
        timestamp: Date.now(),
      };

      useChatStore.getState().addMessage(message);
      const { messages } = useChatStore.getState();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('应该支持添加多条消息', () => {
      const message1: Message = {
        id: '1',
        role: 'user',
        content: '你好',
        timestamp: Date.now(),
      };

      const message2: Message = {
        id: '2',
        role: 'assistant',
        content: '你好！有什么可以帮助你的吗？',
        timestamp: Date.now(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);
      const { messages } = useChatStore.getState();

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });
  });

  describe('updateMessage', () => {
    it('应该更新指定消息的内容', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().updateMessage('1', '你好！');

      const { messages } = useChatStore.getState();
      expect(messages[0].content).toBe('你好！');
    });

    it('不应该更新其他消息', () => {
      const message1: Message = {
        id: '1',
        role: 'user',
        content: '你好',
        timestamp: Date.now(),
      };

      const message2: Message = {
        id: '2',
        role: 'assistant',
        content: '原始内容',
        timestamp: Date.now(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);
      useChatStore.getState().updateMessage('2', '新内容');

      const { messages } = useChatStore.getState();
      expect(messages[0].content).toBe('你好');
      expect(messages[1].content).toBe('新内容');
    });
  });

  describe('setStreaming', () => {
    it('应该设置流式状态为true', () => {
      useChatStore.getState().setStreaming(true);
      const { isStreaming } = useChatStore.getState();
      expect(isStreaming).toBe(true);
    });

    it('应该设置流式状态为false', () => {
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setStreaming(false);
      const { isStreaming } = useChatStore.getState();
      expect(isStreaming).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('应该清空所有消息', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: '你好',
        timestamp: Date.now(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().clearMessages();

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(0);
    });

    it('应该清除错误信息', () => {
      useChatStore.setState({ error: '测试错误' });
      useChatStore.getState().clearMessages();

      const { error } = useChatStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setCurrentSession', () => {
    it('应该设置当前会话ID', () => {
      useChatStore.getState().setCurrentSession('session-123');
      const { currentSessionId } = useChatStore.getState();
      expect(currentSessionId).toBe('session-123');
    });
  });

  describe('setError', () => {
    it('应该设置错误信息', () => {
      useChatStore.getState().setError('网络错误');
      const { error } = useChatStore.getState();
      expect(error).toBe('网络错误');
    });

    it('应该清除错误信息', () => {
      useChatStore.getState().setError('网络错误');
      useChatStore.getState().setError(null);
      const { error } = useChatStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('空消息时应该返回空数组', () => {
      const history = useChatStore.getState().getHistory();
      expect(history).toEqual([]);
    });

    it('应该返回最近的消息历史', () => {
      const msg1: Message = { id: '1', role: 'user', content: '你好', timestamp: 1000 };
      const msg2: Message = { id: '2', role: 'assistant', content: '您好！', timestamp: 1001 };
      const msg3: Message = { id: '3', role: 'user', content: '再问一个', timestamp: 1002 };

      useChatStore.getState().addMessage(msg1);
      useChatStore.getState().addMessage(msg2);
      useChatStore.getState().addMessage(msg3);

      const history = useChatStore.getState().getHistory(5);
      expect(history).toHaveLength(3);
      expect(history[0]).toEqual({ role: 'user', content: '你好' });
      expect(history[1]).toEqual({ role: 'assistant', content: '您好！' });
      expect(history[2]).toEqual({ role: 'user', content: '再问一个' });
    });

    it('应该限制返回轮数', () => {
      // 添加 6 条消息 (3 轮)
      for (let i = 0; i < 6; i++) {
        useChatStore.getState().addMessage({
          id: `msg_${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `内容${i}`,
          timestamp: i,
        });
      }

      // maxRounds=1 应该只返回最近 2 条
      const history = useChatStore.getState().getHistory(1);
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('内容4');
      expect(history[1].content).toBe('内容5');
    });
  });
