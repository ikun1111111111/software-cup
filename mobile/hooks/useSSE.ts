import { useCallback, useRef, useState } from 'react';

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

  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsConnected(false);
    onClose?.();
  }, [onClose]);

  const connect = useCallback(async (url: string, body?: any) => {
    disconnect();
    doneRef.current = false;

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
      if (err.name !== 'AbortError') {
        onError?.(err);
        setIsConnected(false);
      }
    }
  }, [onMessage, onError, onOpen, disconnect]);

  return { connect, disconnect, isConnected };
};
