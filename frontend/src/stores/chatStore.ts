import { create } from 'zustand';

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
}

// 对话状态接口
interface ChatState {
  // 状态
  messages: Message[];
  currentSessionId: string | null;
  isStreaming: boolean;
  error: string | null;

  // 操作
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  setCurrentSession: (sessionId: string) => void;
  setError: (error: string | null) => void;
  removeMessage: (id: string) => void;
}

// 创建对话状态store
export const useChatStore = create<ChatState>((set) => ({
  // 初始状态
  messages: [],
  currentSessionId: null,
  isStreaming: false,
  error: null,

  // 添加消息
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  // 更新消息内容（用于流式接收）
  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    })),

  // 设置流式状态
  setStreaming: (isStreaming) =>
    set({ isStreaming }),

  // 清空消息
  clearMessages: () =>
    set({ messages: [], error: null }),

  // 设置当前会话ID
  setCurrentSession: (sessionId) =>
    set({ currentSessionId: sessionId }),

  // 设置错误信息
  setError: (error) =>
    set({ error }),

  // 删除消息
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),
}));

export default useChatStore;
