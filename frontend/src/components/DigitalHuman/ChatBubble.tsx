import React, { useEffect, useState } from 'react';
import { Message } from '../../stores/chatStore';
import { useBrushWrite } from '../../hooks/useBrushWrite';

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

  // 数字人消息启用毛笔书写效果
  const brushContent = useBrushWrite(
    message.content,
    !isUser && message.status === 'sending'
  );

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
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0,
    ...(isUser
      ? {
          background: 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(200, 75, 49, 0.25)',
        }
      : {
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(26, 95, 180, 0.25)',
        }),
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '75%',
    padding: '12px 18px',
    fontSize: '14px',
    lineHeight: '1.6',
    wordBreak: 'break-word',
    position: 'relative',
    ...(isUser
      ? {
          borderRadius: '20px 20px 4px 20px',
          background: 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(200, 75, 49, 0.2)',
        }
      : {
          borderRadius: '20px 20px 20px 4px',
          background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3EF 100%)',
          color: '#2A2520',
          border: '1px solid #E8E5DF',
          boxShadow: '0 1px 4px rgba(26, 22, 20, 0.05)',
        }),
  };

  /* 数字人消息左侧金色装饰线 */
  const accentLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: -3,
    top: 12,
    bottom: 12,
    width: 3,
    background: 'linear-gradient(180deg, #C8882E, #E8A838)',
    borderRadius: 2,
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
          {!isUser && <span style={accentLineStyle} />}
          {isUser ? renderContent(message.content) : brushContent}
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
