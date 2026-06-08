import { useCallback, useRef, useState } from 'react';

// SSE选项接口
export interface SSEMessage {
  event: string;
  data: any;
}

export interface SSEOptions {
  onMessage?: (msg: SSEMessage) => void;
  onError?: (error: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// SSE Hook返回值接口
export interface SSEReturn {
  connect: (url: string, body?: any) => void;
  disconnect: () => void;
  isConnected: boolean;
  error: any;
}

const SSE_TIMEOUT_MS = 30000; // 30s timeout

/**
 * SSE流式接收Hook
 * 处理AI回复的逐字显示
 */
export const useSSE = (options: SSEOptions = {}): SSEReturn => {
  const { onMessage, onError, onOpen, onClose } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneReceivedRef = useRef(false);

  const clearSSETimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * 断开SSE连接
   */
  const disconnect = useCallback(() => {
    clearSSETimeout();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    onClose?.();
  }, [onClose, clearSSETimeout]);

  /**
   * 建立SSE连接
   */
  const connect = useCallback(async (url: string, body?: any) => {
    // 断开之前的连接
    disconnect();
    doneReceivedRef.current = false;

    // 如果 URL 是相对路径，保持相对路径让浏览器自动使用当前域名
    // vite dev server proxy 会转发 /api 和 /ws 到后端
    const fullUrl = url;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsConnected(true);
      setError(null);
      onOpen?.();

      // 设置整体超时
      timeoutRef.current = setTimeout(() => {
        abortController.abort();
        onError?.(new Error('SSE连接超时'));
        setIsConnected(false);
      }, SSE_TIMEOUT_MS);

      const response = await fetch(fullUrl, {
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
              doneReceivedRef.current = true;
              disconnect();
              return;
            }
            let parsedData: any = rawData;
            try {
              parsedData = JSON.parse(rawData);
            } catch {
              // 保持原始字符串
            }
            if (currentEvent === 'done' || currentEvent === 'faq_hit' || currentEvent === 'error') {
              doneReceivedRef.current = true;
            }
            onMessage?.({ event: currentEvent || 'message', data: parsedData });
            // Reset event after data line so next data without event uses default
            currentEvent = '';
          }
        }
      }

      // Stream naturally ended — if no terminal event was received, synthesize one
      if (!doneReceivedRef.current) {
        onMessage?.({ event: 'done', data: {} });
      }
      disconnect();
    } catch (err: any) {
      clearSSETimeout();
      if (err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
        setIsConnected(false);
      }
    }
  }, [onMessage, onError, onOpen, disconnect, clearSSETimeout]);

  return {
    connect,
    disconnect,
    isConnected,
    error,
  };
};

export default useSSE;
