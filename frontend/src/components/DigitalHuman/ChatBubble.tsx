import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '../../stores/chatStore';
import {
  LikeOutlined,
  DislikeOutlined,
  CheckCircleOutlined,
  BookOutlined,
  DatabaseOutlined,
  SyncOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { renderSmartContent } from '../../utils/chatTextRenderer';

export interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  source?: 'faq' | 'rag' | 'cache' | 'offline';
  showSource?: boolean;
  sessionId?: string;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}月${day}日`;
};

export const isSameDay = (a: number, b: number): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

/* ================================================================
   来源标签组件
   ================================================================ */

const SourceTag: React.FC<{ source?: string }> = ({ source }) => {
  if (!source) return null;

  const config: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    faq: {
      icon: <BookOutlined style={{ fontSize: '10px' }} />,
      label: 'FAQ',
      color: '#2D8B57',
      bg: 'rgba(45, 139, 87, 0.1)',
    },
    rag: {
      icon: <DatabaseOutlined style={{ fontSize: '10px' }} />,
      label: '知识库',
      color: '#4A7A68',
      bg: 'rgba(106, 156, 137, 0.1)',
    },
    cache: {
      icon: <SyncOutlined style={{ fontSize: '10px' }} />,
      label: '缓存',
      color: '#C8A951',
      bg: 'rgba(200, 169, 81, 0.1)',
    },
    offline: {
      icon: <CheckCircleOutlined style={{ fontSize: '10px' }} />,
      label: '离线',
      color: '#7A7468',
      bg: 'rgba(122, 114, 104, 0.1)',
    },
  };

  const c = config[source] || config.rag;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        color: c.color,
        backgroundColor: c.bg,
        marginLeft: '8px',
      }}
    >
      {c.icon}
      {c.label}
    </span>
  );
};

/* ================================================================
   反馈按钮组件
   ================================================================ */

const FeedbackButtons: React.FC<{ messageId: string; sessionId?: string }> = ({ messageId, sessionId }) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleFeedback = (rating: 'like' | 'dislike') => {
    const next = feedback === rating ? null : rating;
    setFeedback(next);
    if (next && sessionId) {
      fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message_id: messageId, rating: next }),
      }).catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
      <button
        onClick={() => handleFeedback('like')}
        style={{
          padding: '3px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          color: feedback === 'like' ? '#2D8B57' : 'var(--text-tertiary)',
          fontSize: '13px',
          transition: 'all 150ms',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}
        title="有帮助"
      >
        <LikeOutlined />
      </button>
      <button
        onClick={() => handleFeedback('dislike')}
        style={{
          padding: '3px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          color: feedback === 'dislike' ? '#DC4444' : 'var(--text-tertiary)',
          fontSize: '13px',
          transition: 'all 150ms',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}
        title="没帮助"
      >
        <DislikeOutlined />
      </button>
    </div>
  );
};

/* ================================================================
   主组件：ChatBubble
   ================================================================ */

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, source, showSource = true, sessionId }) => {
  const [visible, setVisible] = useState(false);
  const [displayContent, setDisplayContent] = useState('');
  const indexRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // 打字机效果：只有 assistant 且正在发送的消息才逐字显示
  useEffect(() => {
    if (isUser) {
      setDisplayContent(message.content);
      return;
    }
    if (!message.content) {
      setDisplayContent('');
      indexRef.current = 0;
      return;
    }

    // 如果消息已完成发送，直接显示全部
    if (message.status === 'sent') {
      setDisplayContent(message.content);
      indexRef.current = message.content.length;
      return;
    }

    // 如果当前已显示内容比消息内容还长，重置
    if (indexRef.current > message.content.length) {
      indexRef.current = 0;
      setDisplayContent('');
    }

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= message.content.length) {
        clearInterval(interval);
      }
      setDisplayContent(message.content.slice(0, indexRef.current));
    }, 20); // 每个字 20ms，响应更迅速

    return () => clearInterval(interval);
  }, [message.content, message.status, isUser]);

  // 判断内容是否为空或只有空白
  const hasContent = displayContent.trim().length > 0;

  // 头像配置
  const avatarConfig = useMemo(() => {
    if (isUser) {
      return {
        bg: 'linear-gradient(135deg, #FCECE9 0%, #FDF5F3 100%)',
        color: '#C84B31',
        icon: <span style={{ fontSize: '14px', fontWeight: 700 }}>你</span>,
        border: '1.5px solid rgba(200, 75, 49, 0.15)',
      };
    }
    return {
      bg: 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
      color: '#fff',
      icon: <RobotOutlined style={{ fontSize: '16px' }} />,
      border: 'none',
    };
  }, [isUser]);

  // 气泡样式
  const bubbleStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isUser ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '20px',
    padding: '0 4px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
  };

  // 书札/朱批气泡主体样式
  const messageBodyStyle: React.CSSProperties = isUser
    ? {
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
        background: 'linear-gradient(135deg, #FCECE9 0%, #FDF5F3 100%)',
        color: '#2A2520',
        fontSize: '14.5px',
        lineHeight: 1.75,
        wordBreak: 'break-word',
        boxShadow: '0 1px 6px rgba(26, 22, 20, 0.06)',
        borderRight: '3px solid var(--color-accent)',
        position: 'relative',
      }
    : {
        padding: '14px 18px',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
        background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3EE 100%)',
        color: 'var(--text-primary)',
        fontSize: '14.5px',
        lineHeight: 1.75,
        wordBreak: 'break-word',
        boxShadow: '0 1px 6px rgba(26, 22, 20, 0.06)',
        borderLeft: '3px solid var(--color-primary)',
        position: 'relative',
      };

  // 内容区域最大宽度
  const maxWidth = isUser ? '70%' : '78%';

  return (
    <div data-testid="chat-bubble" style={bubbleStyle}>
      {/* 内联样式：打字机光标动画 */}
      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .typewriter-cursor {
          animation: blink-cursor 1.2s step-end infinite;
          margin-left: 2px;
          color: var(--color-primary);
          font-weight: 300;
          font-size: 14px;
        }
        .chat-bubble-content p:last-child {
          margin-bottom: 0 !important;
        }
        .chat-bubble-content ul:last-child {
          margin-bottom: 0 !important;
        }
      `}</style>

      {/* 头像 */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: avatarConfig.bg,
          color: avatarConfig.color,
          border: avatarConfig.border,
          boxShadow: isUser
            ? '0 2px 6px rgba(200, 75, 49, 0.1)'
            : '0 2px 8px rgba(106, 156, 137, 0.25)',
        }}
      >
        {avatarConfig.icon}
      </div>

      {/* 内容区域 */}
      <div style={{ minWidth: 0, maxWidth, display: 'flex', flexDirection: 'column' }}>
        {/* 气泡主体 — 书札/朱批 */}
        <div
          ref={contentRef}
          className="chat-bubble-content"
          style={messageBodyStyle}
        >
          {hasContent ? (
            <>
              {renderSmartContent(displayContent)}
              {/* 打字机光标 */}
              {!isUser && message.status === 'sending' && (
                <span className="typewriter-cursor">▋</span>
              )}
            </>
          ) : (
            /* 空内容占位（加载中） */
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  animation: 'pulse-dot 1.4s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  animation: 'pulse-dot 1.4s ease-in-out infinite 0.2s',
                }}
              />
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  animation: 'pulse-dot 1.4s ease-in-out infinite 0.4s',
                }}
              />
              <style>{`
                @keyframes pulse-dot {
                  0%, 100% { opacity: 0.4; transform: scale(0.8); }
                  50% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          )}
        </div>

        {/* 元信息行：时间 + 来源 + 反馈 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '5px',
            padding: isUser ? '0 4px 0 0' : '0 0 0 4px',
            flexDirection: isUser ? 'row-reverse' : 'row',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              fontWeight: 400,
            }}
          >
            {formatTime(message.timestamp)}
          </span>

          {!isUser && showSource && source && <SourceTag source={source} />}

          {!isUser && message.status === 'sent' && (
            <FeedbackButtons messageId={message.id} sessionId={sessionId} />
          )}

          {message.status && message.status !== 'sent' && (
            <span
              style={{
                fontSize: '11px',
                color: message.status === 'error' ? 'var(--color-error)' : 'var(--text-tertiary)',
                fontWeight: 400,
              }}
            >
              {message.status === 'sending' && '发送中'}
              {message.status === 'error' && '发送失败'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   导出：时间分隔线组件
   ================================================================ */

export interface TimeDividerProps {
  timestamp: number;
}

export const TimeDivider: React.FC<TimeDividerProps> = ({ timestamp }) => {
  const now = Date.now();
  const isToday = isSameDay(timestamp, now);

  let label: string;
  if (isToday) {
    label = formatTime(timestamp);
  } else {
    label = `${formatDate(timestamp)} ${formatTime(timestamp)}`;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '20px 0',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontWeight: 400,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
    </div>
  );
};

export default ChatBubble;
