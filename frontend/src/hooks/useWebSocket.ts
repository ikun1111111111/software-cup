import { useCallback, useEffect, useRef, useState } from 'react';

// WebSocket选项接口
export interface WebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

// WebSocket Hook返回值接口
export interface WebSocketReturn {
  connect: (url: string) => void;
  disconnect: () => void;
  send: (data: any) => void;
  isConnected: boolean;
  error: Event | null;
}

/**
 * WebSocket信令封装Hook
 * 处理音频流双向通信
 */
export const useWebSocket = (options: WebSocketOptions = {}): WebSocketReturn => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlRef = useRef<string>('');

  /**
   * 建立WebSocket连接
   */
  const connect = useCallback((url: string) => {
    // 断开之前的连接
    disconnect();

    urlRef.current = url;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onerror = (event) => {
        setError(event);
        onError?.(event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();

        // 自动重连
        if (autoReconnect && urlRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(urlRef.current);
          }, reconnectInterval);
        }
      };
    } catch (err: any) {
      setError(err);
      onError?.(err);
    }
  }, [onMessage, onError, onOpen, onClose, autoReconnect, reconnectInterval]);

  /**
   * 断开WebSocket连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    urlRef.current = '';
  }, []);

  /**
   * 发送数据
   */
  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  }, []);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    error,
  };
};

export default useWebSocket;
