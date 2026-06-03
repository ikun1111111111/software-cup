import React, { useEffect, useState } from 'react';
import { Message } from '../../stores/chatStore';

export interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const renderContent = (content: string): React.ReactNode => {
  return content.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < content.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const bubbleStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isUser ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '16px',
    padding: '0 4px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 250ms ease-out, transform 250ms ease-out',
  };

  const avatarStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0,
    background: isUser
      ? 'var(--color-primary-bg)'
      : 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
    color: isUser ? 'var(--color-primary)' : '#fff',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    backgroundColor: isUser ? 'var(--color-primary)' : 'var(--surface-card)',
    color: isUser ? '#fff' : 'var(--text-primary)',
    fontSize: '14px',
    lineHeight: '1.6',
    wordBreak: 'break-word',
    boxShadow: isUser
      ? '0 2px 8px rgba(26, 95, 180, 0.2)'
      : '0 1px 4px rgba(26, 22, 20, 0.06)',
    border: isUser ? 'none' : '1px solid var(--border-light)',
  };

  const timeStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    textAlign: isUser ? 'right' : 'left',
  };

  const statusStyle: React.CSSProperties = {
    fontSize: '11px',
    color: message.status === 'error' ? 'var(--color-error)' : 'var(--text-tertiary)',
    marginTop: '2px',
  };

  return (
    <div data-testid="chat-bubble" style={bubbleStyle}>
      <div style={avatarStyle}>
        {isUser ? '你' : '灵'}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={contentStyle}>
          {renderContent(message.content)}
        </div>
        <div style={timeStyle}>{formatTime(message.timestamp)}</div>
        {message.status && message.status !== 'sent' && (
          <div style={statusStyle}>
            {message.status === 'sending' && '发送中...'}
            {message.status === 'error' && '发送失败'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
