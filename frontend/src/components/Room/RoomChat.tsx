import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, RobotOutlined } from '@ant-design/icons';

export interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  from: string;
  content: string;
  timestamp: number;
}

interface RoomChatProps {
  messages: ChatMessage[];
  connected: boolean;
  onSend: (question: string) => void;
  disabled?: boolean;
}

/**
 * AI Q&A panel for collaborative rooms.
 * All members see the same Q&A history broadcast via WebSocket.
 */
const RoomChat: React.FC<RoomChatProps> = ({
  messages,
  connected,
  onSend,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !connected) return;
    onSend(text);
    setInput('');
  }, [input, connected, onSend]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div
      data-testid="room-chat"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-bg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--surface-card)',
          flexShrink: 0,
        }}
      >
        <RobotOutlined style={{ color: 'var(--color-primary)', fontSize: '16px' }} />
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
          AI 导游问答
        </span>
        <span
          style={{
            fontSize: '12px',
            color: connected ? 'var(--color-success)' : 'var(--text-tertiary)',
            marginLeft: 'auto',
          }}
        >
          {connected ? '在线' : '离线'}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: 'var(--text-tertiary)',
              fontSize: '13px',
            }}
          >
            <RobotOutlined style={{ fontSize: '28px', marginBottom: '8px', color: 'var(--gray-300)' }} />
            <div>在房间内向 AI 导游提问</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              所有成员都能看到问答记录
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.type === 'question' ? 'row-reverse' : 'row',
              marginBottom: '10px',
              animation: 'fadeInUp 200ms ease-out',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius:
                  msg.type === 'question'
                    ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
                    : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
                backgroundColor:
                  msg.type === 'question'
                    ? 'var(--color-primary-bg)'
                    : 'var(--surface-card)',
                border: '1px solid var(--border-light)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '3px',
                  display: 'flex',
                  gap: '6px',
                }}
              >
                <span>{msg.from}</span>
                <span>{formatTime(msg.timestamp)}</span>
              </div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 16px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--surface-card)',
          flexShrink: 0,
        }}
      >
        <Input
          placeholder={connected ? '向 AI 导游提问...' : '未连接'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || !connected}
          style={{ flex: 1, borderRadius: 'var(--radius-xl)', height: 36 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={disabled || !connected || !input.trim()}
          style={{
            borderRadius: 'var(--radius-xl)',
            height: 36,
            background: input.trim()
              ? 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)'
              : undefined,
            border: 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RoomChat;
