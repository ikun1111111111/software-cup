import { useCallback, useRef, useState } from 'react';

// SSE选项接口
export interface SSEOptions {
  onMessage?: (data: string) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// SSE Hook返回值接口
export interface SSEReturn {
  connect: (url: string, body?: any) => void;
  disconnect: () => void;
  isConnected: boolean;
  error: Event | null;
}

/**
 * SSE流式接收Hook
 * 处理AI回复的逐字显示
 */
export const useSSE = (options: SSEOptions = {}): SSEReturn => {
  const { onMessage, onError, onOpen, onClose } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 建立SSE连接
   */
  const connect = useCallback(async (url: string, body?: any) => {
    // 断开之前的连接
    disconnect();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsConnected(true);
      setError(null);
      onOpen?.();

      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 解析SSE事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
      for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6);
            if (rawData === '[DONE]') {
              disconnect();
              return;
            }
            try {
              const parsed = JSON.parse(rawData);
              onMessage?.({ ...parsed, _event: currentEvent });
            } catch {
              onMessage?.({ token: rawData, _event: currentEvent });
            }
            currentEvent = '';
          }
        }
      }

      disconnect();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
        setIsConnected(false);
      }
    }
  }, [onMessage, onError, onOpen, onClose]);

  /**
   * 断开SSE连接
   */
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    onClose?.();
  }, [onClose]);

  return {
    connect,
    disconnect,
    isConnected,
    error,
  };
};

export default useSSE;
