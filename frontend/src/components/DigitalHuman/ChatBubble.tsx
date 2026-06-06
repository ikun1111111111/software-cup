import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message } from '../../stores/chatStore';
import {
  LikeOutlined,
  DislikeOutlined,
  CheckCircleOutlined,
  BookOutlined,
  DatabaseOutlined,
  SyncOutlined,
  RobotOutlined,
} from '@ant-design/icons';
// Brush write hook available from remote — can be integrated later
// import { useBrushWrite } from '../../hooks/useBrushWrite';

export interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  source?: 'faq' | 'rag' | 'cache' | 'offline';
  showSource?: boolean;
}

/* ================================================================
   工具函数
   ================================================================ */

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

/** 判断是否为同一天 */
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
   智能文本渲染引擎
   ================================================================ */

// 景区相关关键词，用于高亮
const SPOT_KEYWORDS = [
  '灵山大佛', '梵宫', '九龙灌浴', '五印坛城', '曼飞龙塔',
  '天下第一掌', '百子戏弥勒', '灵山吉祥颂', '太湖观景台',
  '灵山胜境', '灵山风景区', '灵山', '太湖',
];

// 价格模式
const PRICE_PATTERN = /(\d+元|\d+\.?\d*元|\d+元\/人|\d+元\/张|\d+元\/位)/g;
// 时间模式
const TIME_PATTERN = /(\d{1,2}:\d{2}|\d{1,2}点|\d{1,2}:\d{2}-\d{1,2}:\d{2}|全年开放|夏季|冬季)/g;
// 数字+单位模式（高度、距离等）
const NUMBER_PATTERN = /(\d+\.?\d*\s*(米|公里|km|m|吨|公顷|亩|平方米|立方米))/gi;

interface TextSegment {
  type: 'text' | 'spot' | 'price' | 'time' | 'number' | 'quote';
  content: string;
}

/** 将一行文本切分为高亮片段 */
const segmentLine = (line: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let remaining = line;

  // 先处理引用块（以「」包裹）
  const quoteRegex = /「([^」]+)」/g;
  let quoteMatch: RegExpExecArray | null;
  const quoteRanges: [number, number, string][] = [];
  while ((quoteMatch = quoteRegex.exec(line)) !== null) {
    quoteRanges.push([quoteMatch.index, quoteMatch.index + quoteMatch[0].length, quoteMatch[1]]);
  }

  // 再处理景点名称
  const spotRanges: [number, number, string][] = [];
  for (const spot of SPOT_KEYWORDS) {
    let idx = remaining.indexOf(spot);
    while (idx !== -1) {
      // 检查是否被引用范围覆盖
      const inQuote = quoteRanges.some(
        ([start, end]) => idx >= start && idx + spot.length <= end
      );
      if (!inQuote) {
        spotRanges.push([idx, idx + spot.length, spot]);
      }
      idx = remaining.indexOf(spot, idx + 1);
    }
  }

  // 合并所有范围并按位置排序
  const allRanges: { start: number; end: number; type: TextSegment['type']; content: string }[] = [
    ...quoteRanges.map(([s, e, c]) => ({ start: s, end: e, type: 'quote' as const, content: c })),
    ...spotRanges.map(([s, e, c]) => ({ start: s, end: e, type: 'spot' as const, content: c })),
  ];

  // 价格
  let m: RegExpExecArray | null;
  const priceRegex = new RegExp(PRICE_PATTERN.source, 'g');
  while ((m = priceRegex.exec(line)) !== null) {
    allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'price', content: m[0] });
  }

  // 时间
  const timeRegex = new RegExp(TIME_PATTERN.source, 'g');
  while ((m = timeRegex.exec(line)) !== null) {
    allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'time', content: m[0] });
  }

  // 数字+单位
  const numRegex = new RegExp(NUMBER_PATTERN.source, 'gi');
  while ((m = numRegex.exec(line)) !== null) {
    // 避免和已有范围重叠
    const overlap = allRanges.some(
      (r) => (m!.index >= r.start && m!.index < r.end) || (m!.index + m![0].length > r.start && m!.index + m![0].length <= r.end)
    );
    if (!overlap) {
      allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'number', content: m[0] });
    }
  }

  // 按位置排序，去重（优先保留前面的）
  allRanges.sort((a, b) => a.start - b.start);
  const deduped: typeof allRanges = [];
  for (const r of allRanges) {
    const overlap = deduped.some(
      (d) => (r.start >= d.start && r.start < d.end) || (r.end > d.start && r.end <= d.end)
    );
    if (!overlap) deduped.push(r);
  }

  // 构建片段
  let pos = 0;
  for (const r of deduped) {
    if (r.start > pos) {
      segments.push({ type: 'text', content: remaining.slice(pos, r.start) });
    }
    segments.push({ type: r.type, content: r.content });
    pos = r.end;
  }
  if (pos < remaining.length) {
    segments.push({ type: 'text', content: remaining.slice(pos) });
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: line });
  }

  return segments;
};

/** 渲染一个高亮片段 */
const renderSegment = (seg: TextSegment, idx: number): React.ReactNode => {
  switch (seg.type) {
    case 'spot':
      return (
        <span
          key={idx}
          style={{
            color: '#1A5FB4',
            fontWeight: 600,
            backgroundColor: 'rgba(26, 95, 180, 0.08)',
            padding: '0 4px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 150ms',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = 'rgba(26, 95, 180, 0.15)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = 'rgba(26, 95, 180, 0.08)';
          }}
        >
          {seg.content}
        </span>
      );
    case 'price':
      return (
        <span
          key={idx}
          style={{
            color: '#C8882E',
            fontWeight: 600,
            backgroundColor: 'rgba(200, 136, 46, 0.08)',
            padding: '0 4px',
            borderRadius: '4px',
          }}
        >
          {seg.content}
        </span>
      );
    case 'time':
      return (
        <span
          key={idx}
          style={{
            color: '#2D8B57',
            fontWeight: 500,
            backgroundColor: 'rgba(45, 139, 87, 0.08)',
            padding: '0 4px',
            borderRadius: '4px',
          }}
        >
          {seg.content}
        </span>
      );
    case 'number':
      return (
        <span
          key={idx}
          style={{
            color: '#8B5CF6',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {seg.content}
        </span>
      );
    case 'quote':
      return (
        <span
          key={idx}
          style={{
            color: '#5C554C',
            fontStyle: 'italic',
            borderLeft: '2px solid var(--color-accent)',
            paddingLeft: '6px',
            marginLeft: '2px',
          }}
        >
          「{seg.content}」
        </span>
      );
    default:
      return <span key={idx}>{seg.content}</span>;
  }
};

/** 判断一行是否为列表项 */
const isListItem = (line: string): { type: 'ordered' | 'unordered'; content: string } | null => {
  const ordered = /^\s*(\d+[\.、])\s*(.+)$/.exec(line);
  if (ordered) {
    return { type: 'ordered', content: ordered[2] };
  }
  const unordered = /^\s*([-\*•])\s*(.+)$/.exec(line);
  if (unordered) {
    return { type: 'unordered', content: unordered[2] };
  }
  return null;
};

/** 智能渲染消息内容 */
const renderSmartContent = (content: string): React.ReactNode[] => {
  if (!content) return [];

  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: { type: 'ordered' | 'unordered'; items: string[] } | null = null;
  let keyIdx = 0;

  const flushList = () => {
    if (!listBuffer || listBuffer.items.length === 0) return;
    const isOrdered = listBuffer.type === 'ordered';
    result.push(
      <ul
        key={`list-${keyIdx++}`}
        style={{
          margin: '8px 0',
          paddingLeft: isOrdered ? '20px' : '16px',
          listStyle: isOrdered ? 'decimal' : 'none',
        }}
      >
        {listBuffer.items.map((item, i) => (
          <li
            key={i}
            style={{
              marginBottom: '6px',
              lineHeight: 1.7,
              position: 'relative',
              ...(isOrdered
                ? {}
                : {
                    paddingLeft: '14px',
                  }),
            }}
          >
            {!isOrdered && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '8px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            )}
            {segmentLine(item).map((seg, si) => renderSegment(seg, si))}
          </li>
        ))}
      </ul>
    );
    listBuffer = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 空行：结束列表，添加段落间距
    if (!trimmed) {
      flushList();
      continue;
    }

    // 列表项
    const listInfo = isListItem(line);
    if (listInfo) {
      if (!listBuffer) {
        listBuffer = { type: listInfo.type, items: [] };
      } else if (listBuffer.type !== listInfo.type) {
        flushList();
        listBuffer = { type: listInfo.type, items: [] };
      }
      listBuffer.items.push(listInfo.content);
      continue;
    }

    // 普通段落
    flushList();
    const segments = segmentLine(line);
    result.push(
      <p
        key={`p-${keyIdx++}`}
        style={{
          margin: '0 0 10px 0',
          lineHeight: 1.75,
          wordBreak: 'break-word',
        }}
      >
        {segments.map((seg, si) => renderSegment(seg, si))}
      </p>
    );
  }

  flushList();
  return result;
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
      color: '#1A5FB4',
      bg: 'rgba(26, 95, 180, 0.1)',
    },
    cache: {
      icon: <SyncOutlined style={{ fontSize: '10px' }} />,
      label: '缓存',
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
    offline: {
      icon: <CheckCircleOutlined style={{ fontSize: '10px' }} />,
      label: '离线',
      color: '#7A7268',
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

const FeedbackButtons: React.FC<{ messageId: string }> = ({ messageId }) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
      <button
        onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
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
        onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
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

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, source, showSource = true }) => {
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
    }, 35); // 每个字 35ms，比原来稍快

    return () => clearInterval(interval);
  }, [message.content, message.status, isUser]);

  // 判断内容是否为空或只有空白
  const hasContent = displayContent.trim().length > 0;

  // 头像配置
  const avatarConfig = useMemo(() => {
    if (isUser) {
      return {
        bg: 'linear-gradient(135deg, #E8F0FE 0%, #D4E4FA 100%)',
        color: '#1A5FB4',
        icon: <span style={{ fontSize: '14px', fontWeight: 700 }}>你</span>,
        border: '1.5px solid rgba(26, 95, 180, 0.15)',
      };
    }
    return {
      bg: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
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
            ? '0 2px 6px rgba(26, 95, 180, 0.1)'
            : '0 2px 8px rgba(26, 95, 180, 0.25)',
        }}
      >
        {avatarConfig.icon}
      </div>

      {/* 内容区域 */}
      <div style={{ minWidth: 0, maxWidth, display: 'flex', flexDirection: 'column' }}>
        {/* 气泡主体 */}
        <div
          ref={contentRef}
          className="chat-bubble-content"
          style={{
            padding: isUser ? '12px 16px' : '14px 18px',
            borderRadius: isUser
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            backgroundColor: isUser ? 'var(--color-primary)' : 'var(--surface-card)',
            color: isUser ? '#fff' : 'var(--text-primary)',
            fontSize: '14.5px',
            lineHeight: 1.75,
            wordBreak: 'break-word',
            boxShadow: isUser
              ? '0 2px 10px rgba(26, 95, 180, 0.18)'
              : '0 1px 6px rgba(26, 22, 20, 0.06), 0 1px 2px rgba(26, 22, 20, 0.04)',
            border: isUser ? 'none' : '1px solid var(--border-light)',
            position: 'relative',
          }}
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
            <FeedbackButtons messageId={message.id} />
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
