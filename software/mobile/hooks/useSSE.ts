import { useCallback, useRef, useState } from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 指数退避

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

export const useSSE = (options: SSEOptions = {}) => {
  const { onMessage, onError, onOpen, onClose } = options;
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const doneRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存上次连接参数用于重连
  const lastUrlRef = useRef<string>('');
  const lastBodyRef = useRef<any>(undefined);

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsConnected(false);
    onClose?.();
  }, [onClose]);

  const _doConnect = useCallback(async (url: string, body?: any) => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsConnected(true);
      onOpen?.();

      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 连接成功，重置重试计数
      retryCountRef.current = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            if (raw === '[DONE]') {
              doneRef.current = true;
              disconnect();
              return;
            }
            let parsed: any = raw;
            try { parsed = JSON.parse(raw); } catch {}
            if (currentEvent === 'done' || currentEvent === 'faq_hit' || currentEvent === 'error') {
              doneRef.current = true;
            }
            onMessage?.({ event: currentEvent || 'message', data: parsed });
            currentEvent = '';
          }
        }
      }

      if (!doneRef.current) {
        onMessage?.({ event: 'done', data: {} });
      }
      disconnect();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 主动取消，不重连
        return;
      }

      // 尝试重连
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCountRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        retryCountRef.current++;
        console.log(`[SSE] Retry ${retryCountRef.current}/${MAX_RETRIES} after ${delay}ms`);
        retryTimerRef.current = setTimeout(() => {
          _doConnect(url, body);
        }, delay);
      } else {
        onError?.(err);
        setIsConnected(false);
      }
    }
  }, [onMessage, onError, onOpen, disconnect]);

  const connect = useCallback(async (url: string, body?: any) => {
    disconnect();
    doneRef.current = false;
    lastUrlRef.current = url;
    lastBodyRef.current = body;
    await _doConnect(url, body);
  }, [disconnect, _doConnect]);

  return { connect, disconnect, isConnected };
};
