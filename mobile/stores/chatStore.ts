import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  source?: 'faq' | 'rag' | 'cache' | 'offline';
}

interface ChatState {
  messages: Message[];
  currentSessionId: string | null;
  isStreaming: boolean;
  error: string | null;

  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  setCurrentSession: (sessionId: string) => void;
  setError: (error: string | null) => void;
  getHistory: (maxRounds?: number) => Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentSessionId: null,
  isStreaming: false,
  error: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg,
      ),
    })),

  updateMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, status } : msg,
      ),
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  clearMessages: () => set({ messages: [], error: null }),

  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

  setError: (error) => set({ error }),

  getHistory: (maxRounds = 5) => {
    const { messages } = get();
    return messages.slice(-maxRounds * 2).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  },
}));
