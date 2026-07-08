import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  source?: 'faq' | 'rag' | 'cache' | 'offline';
}

// 对话状态接口
interface ChatState {
  // 状态
  messages: Message[];
  currentSessionId: string | null;
  isStreaming: boolean;
  error: string | null;
  activeTopic: string | null;
  panelCollapsed: boolean;

  // 操作
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  setCurrentSession: (sessionId: string) => void;
  setError: (error: string | null) => void;
  removeMessage: (id: string) => void;
  setActiveTopic: (topic: string | null) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  getHistory: (maxRounds?: number) => Array<{ role: 'user' | 'assistant'; content: string }>;
}

// 创建对话状态store
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  // 初始状态
  messages: [],
  currentSessionId: null,
  isStreaming: false,
  error: null,
  activeTopic: null,
  panelCollapsed: true,

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

  // 更新消息状态
  updateMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, status } : msg
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

  // 设置当前主题
  setActiveTopic: (topic) =>
    set({ activeTopic: topic, panelCollapsed: topic ? false : true }),

  // 设置信息面板折叠状态
  setPanelCollapsed: (collapsed) =>
    set({ panelCollapsed: collapsed }),

  // 获取历史消息（用于传给后端API）
  getHistory: (maxRounds = 5) => {
    const { messages } = get();
    // 取最近 maxRounds * 2 条消息（每轮= user + assistant）
    const recent = messages.slice(-maxRounds * 2);
    return recent.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        messages: state.messages.filter((m) => m.status !== 'sending'),
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);

export default useChatStore;
