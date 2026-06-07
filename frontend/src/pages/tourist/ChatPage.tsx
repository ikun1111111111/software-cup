import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Input, Button, Tag } from 'antd';
import {
  SendOutlined,
  CompassOutlined,
  CoffeeOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  CloseOutlined,
  BulbOutlined,
  BookOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import ChatBubble, { TimeDivider, isSameDay } from '../../components/DigitalHuman/ChatBubble';
import VoiceInput from '../../components/DigitalHuman/VoiceInput';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { useChatStore, Message } from '../../stores/chatStore';
import { useSSE } from '../../hooks/useSSE';
import { getStory } from '../../api/story';
import { synthesizeSpeech, type PhonemeTimestamp } from '../../api/tts';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

/* ================================================================
   情感检测
   ================================================================ */

function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢满意]/.test(text)) return 'smile';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

/* ================================================================
   快捷问题配置
   ================================================================ */

interface QuickQuestion {
  text: string;
  icon: React.ReactNode;
  category: string;
  color: string;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    text: '灵山大佛有多高？',
    icon: <InfoCircleOutlined />,
    category: '景点',
    color: '#1A5FB4',
  },
  {
    text: '推荐一条游玩路线',
    icon: <CompassOutlined />,
    category: '路线',
    color: '#2D8B57',
  },
  {
    text: '附近有什么美食推荐？',
    icon: <CoffeeOutlined />,
    category: '美食',
    color: '#C8882E',
  },
  {
    text: '景区门票多少钱？',
    icon: <ThunderboltOutlined />,
    category: '门票',
    color: '#8B5CF6',
  },
  {
    text: '九龙灌浴表演时间',
    icon: <MessageOutlined />,
    category: '表演',
    color: '#13c2c2',
  },
  {
    text: '景区开放时间',
    icon: <BulbOutlined />,
    category: '服务',
    color: '#E67E22',
  },
  {
    text: '怎么去灵山胜境？',
    icon: <CompassOutlined />,
    category: '交通',
    color: '#DC4444',
  },
];

/* ================================================================
   AI 思考中动画组件
   ================================================================ */

const ThinkingIndicator: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginBottom: '20px',
        padding: '0 4px',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(26, 95, 180, 0.25)',
        }}
      >
        <BulbOutlined style={{ fontSize: '16px' }} />
      </div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '18px 18px 18px 4px',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 1px 6px rgba(26, 22, 20, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                animation: `thinking-pulse 1.4s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          小景正在思考
        </span>
        <style>{`
          @keyframes thinking-pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
};

/* ================================================================
   错误提示组件（Toast 风格）
   ================================================================ */

const ErrorToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        backgroundColor: '#FDECEA',
        border: '1px solid rgba(220, 68, 68, 0.2)',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(220, 68, 68, 0.15)',
        animation: 'error-slide-in 300ms ease-out',
        maxWidth: '90vw',
      }}
    >
      <style>{`
        @keyframes error-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <span
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#DC4444',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        !
      </span>
      <span
        style={{
          fontSize: '13px',
          color: '#DC4444',
          fontWeight: 500,
        }}
      >
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#DC4444',
          fontSize: '12px',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
};

/* ================================================================
   主组件：ChatPage
   ================================================================ */

const ChatPage: React.FC = () => {
  const location = useLocation();
  const [inputText, setInputText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [inputFocused, setInputFocused] = useState(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [phonemes, setPhonemes] = useState<PhonemeTimestamp[] | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(
    () => sessionStorage.getItem('active_room_id'),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // Handle vision → chat navigation
  const fromVision = (location.state as any)?.fromVision;
  const visionSpotName = (location.state as any)?.spotName;

  // Listen for room changes
  useEffect(() => {
    const handler = () => {
      setRoomId(sessionStorage.getItem('active_room_id'));
    };
    window.addEventListener('room_changed', handler);
    return () => window.removeEventListener('room_changed', handler);
  }, []);

  // Mobile resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    messages,
    currentSessionId,
    isStreaming,
    error,
    addMessage,
    updateMessage,
    updateMessageStatus,
    setStreaming,
    setCurrentSession,
    setError,
    getHistory,
  } = useChatStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // Call TTS and feed audio to DigitalHuman
  const speakText = useCallback(async (text: string) => {
    try {
      setAudioChunks([]);
      setPhonemes(null);
      setIsAvatarSpeaking(true);
      const result = await synthesizeSpeech(text);
      if (result.audioChunks.length > 0) {
        setAudioChunks(result.audioChunks);
      }
      if (result.phonemes.length > 0) {
        setPhonemes(result.phonemes);
      }
      // Keep speaking indicator for the audio duration (or min 3s)
      const duration = result.durationMs || Math.max(text.length * 250, 3000);
      setTimeout(() => {
        setIsAvatarSpeaking(false);
        setAudioChunks([]);
        setPhonemes(null);
      }, duration);
    } catch {
      // TTS failed — still show speaking animation briefly
      setTimeout(() => setIsAvatarSpeaking(false), 3000);
    }
  }, []);

  /* ---------- SSE 连接 ---------- */
  const { connect, disconnect } = useSSE({
    onMessage: (msg) => {
      const {
        messages: latestMessages,
        updateMessage: latestUpdateMessage,
        updateMessageStatus: latestUpdateStatus,
      } = useChatStore.getState();
      const lastMessage = latestMessages[latestMessages.length - 1];

      if (msg.event === 'token') {
        if (lastMessage && lastMessage.role === 'assistant') {
          latestUpdateMessage(lastMessage.id, lastMessage.content + (msg.data.token || ''));
        }
      } else if (msg.event === 'faq_hit') {
        if (lastMessage && lastMessage.role === 'assistant') {
          latestUpdateMessage(lastMessage.id, msg.data.answer || '');
          latestUpdateStatus(lastMessage.id, 'sent');
          useChatStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === lastMessage.id ? { ...m, source: 'faq' as const } : m
            ),
          }));
        }
        setStreaming(false);
        if (lastMessage) {
          const answer = msg.data.answer || '';
          const detected = detectEmotion(answer);
          setEmotion(detected);
          speakText(answer);
        }
      } else if (msg.event === 'done') {
        setStreaming(false);
        if (lastMessage) {
          latestUpdateMessage(lastMessage.id, lastMessage.content);
          latestUpdateStatus(lastMessage.id, 'sent');
          const sourceFromData = msg.data?.source as 'faq' | 'rag' | 'cache' | 'offline' | undefined;
          if (sourceFromData) {
            useChatStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === lastMessage.id ? { ...m, source: sourceFromData } : m
              ),
            }));
          }
          const detected = detectEmotion(lastMessage.content);
          setEmotion(detected);
          speakText(lastMessage.content);
        }
      } else if (msg.event === 'error') {
        setError(msg.data.error || '生成回答时出错，请稍后重试');
        setStreaming(false);
        if (lastMessage) {
          latestUpdateStatus(lastMessage.id, 'error');
        }
      }
    },
    onError: (err) => {
      setError('连接错误，请重试');
      setStreaming(false);
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSession(`session_${Date.now()}`);
    }
  }, [currentSessionId, setCurrentSession]);

  // Auto-trigger question when arriving from VisionPage
  useEffect(() => {
    if (fromVision && visionSpotName) {
      const question = `介绍一下${visionSpotName}`;
      doSend(question);
      // Clear location state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 发送消息 ---------- */
  const doSend = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };

      addMessage(userMessage);
      setInputText('');
      setEmotion('think');

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      addMessage(assistantMessage);
      setStreaming(true);
      setIsAvatarSpeaking(false);

      connect('/api/chat/stream', {
        session_id: currentSessionId,
        question: text.trim(),
        stream: true,
        history: getHistory(5),
      });
    },
    [isStreaming, currentSessionId, addMessage, setStreaming, connect, getHistory]
  );

  const handleSendText = useCallback(() => {
    doSend(inputText);
  }, [inputText, doSend]);

  const handleStory = useCallback(async (spotName: string) => {
    if (isStreaming || storyLoading) return;

    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: `讲一个${spotName}的故事`,
      timestamp: Date.now(),
      status: 'sent',
    });
    setStoryLoading(true);
    setEmotion('think');

    try {
      const result = await getStory(spotName);
      addMessage({
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: result.story,
        timestamp: Date.now(),
        status: 'sent',
      });
      setEmotion(result.emotion as Emotion);
      speakText(result.story);
    } catch {
      // error handled silently
    } finally {
      setStoryLoading(false);
    }
  }, [isStreaming, storyLoading, addMessage, speakText]);

  const handleSendAudio = useCallback(
    (audioBlob: Blob) => {
      if (isStreaming) return;

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: '[语音消息]',
        timestamp: Date.now(),
        status: 'sent',
      };

      addMessage(userMessage);
      setEmotion('think');

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      addMessage(assistantMessage);
      setStreaming(true);

      connect(`/api/chat/audio?session=${currentSessionId}`);
    },
    [isStreaming, currentSessionId, addMessage, setStreaming, connect]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  /* ---------- 渲染消息列表（带时间分隔） ---------- */
  const renderMessages = () => {
    const result: React.ReactNode[] = [];
    let lastTimestamp: number | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // 添加时间分隔线（当时间间隔超过5分钟或跨天时）
      if (lastTimestamp === null || !isSameDay(msg.timestamp, lastTimestamp)) {
        result.push(<TimeDivider key={`time-${msg.id}`} timestamp={msg.timestamp} />);
      } else if (msg.timestamp - lastTimestamp > 5 * 60 * 1000) {
        result.push(<TimeDivider key={`time-${msg.id}`} timestamp={msg.timestamp} />);
      }

      result.push(
        <ChatBubble
          key={msg.id}
          message={msg}
          isUser={msg.role === 'user'}
          source={msg.source}
          showSource={msg.role !== 'user'}
        />
      );

      lastTimestamp = msg.timestamp;
    }

    return result;
  };

  const isEmpty = messages.length === 0;

  /* ---------- 面板渲染 ---------- */

  const avatarPanel = (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--surface-bg)',
        overflow: 'hidden',
        ...(isMobile
          ? { padding: '12px 16px 4px', flexShrink: 0 }
          : {
              width: 380,
              minWidth: 320,
              borderRight: '1px solid var(--border-light)',
              padding: '24px 16px',
            }),
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(106,156,137,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,136,46,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,139,87,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="animate-float">
        <DigitalHuman
          emotion={emotion}
          isSpeaking={isAvatarSpeaking}
          audioChunks={audioChunks}
          phonemes={phonemes}
          width={isMobile ? 180 : 320}
          height={isMobile ? 240 : 500}
          onReady={() => console.log('[ChatPage] Digital human ready')}
        />
      </div>

      {/* 全息投影底座 */}
      {!isMobile && (
        <div style={{
          position: 'relative',
          width: 240,
          height: 48,
          margin: '-8px auto 0',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: isAvatarSpeaking
              ? 'radial-gradient(ellipse at center, rgba(200,75,49,0.18) 0%, rgba(200,75,49,0.06) 40%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(26,95,180,0.15) 0%, rgba(26,95,180,0.05) 40%, transparent 70%)',
            animation: isAvatarSpeaking
              ? 'holoSpeak 1.5s ease-in-out infinite'
              : 'holoPulse 3s ease-in-out infinite',
            transition: 'background 500ms ease',
          }} />
          <div style={{
            position: 'absolute',
            bottom: 4,
            left: '15%',
            right: '15%',
            height: 2,
            borderRadius: 1,
            background: isAvatarSpeaking
              ? 'linear-gradient(90deg, transparent, rgba(200,75,49,0.4), rgba(232,93,58,0.6), rgba(200,75,49,0.4), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(26,95,180,0.3), rgba(53,132,228,0.5), rgba(26,95,180,0.3), transparent)',
            transition: 'background 500ms ease',
          }} />
          {isAvatarSpeaking && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%',
              borderRadius: '50%',
              border: '1px solid rgba(200,75,49,0.15)',
              animation: 'holoRipple 2s ease-out infinite',
            }} />
          )}
        </div>
      )}

      {/* 数字人名字标签 */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? 12 : 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(26, 22, 20, 0.06)',
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: isAvatarSpeaking ? '#2D8B57' : '#A8A198',
            transition: 'background-color 300ms',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          小景 {isAvatarSpeaking ? '正在讲解' : '在线'}
        </span>
      </div>

      <style>{`
        @keyframes holoPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes holoSpeak {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes holoRipple {
          0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
        }
      `}</style>
    </div>
  );

  const chatPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--surface-bg)',
      }}
    >
      {/* 消息列表区域 */}
      <div
        data-testid="message-list"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? '8px 12px 16px' : '16px 24px 20px',
          scrollBehavior: 'smooth',
        }}
      >
        {/* 空状态：欢迎页 */}
        {isEmpty && (
          <div
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              paddingTop: isMobile ? '16px' : '40px',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            {/* 欢迎标题 */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: isMobile ? '18px' : '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  letterSpacing: '0.5px',
                }}
              >
                你好，我是小景 👋
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  maxWidth: 400,
                }}
              >
                灵山胜境专属 AI 导游，为你解答景点、路线、美食、门票等各类问题
              </div>
              {roomId && (
                <Tag
                  icon={<TeamOutlined />}
                  color="orange"
                  style={{
                    marginTop: '10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '13px',
                    padding: '4px 12px',
                  }}
                >
                  协同房间 {roomId}
                </Tag>
              )}
            </div>

            {/* 快捷问题卡片网格 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: '10px',
                width: '100%',
                padding: '0 4px',
              }}
            >
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={q.text}
                  className={`animate-fade-in-up stagger-${i + 1}`}
                  onClick={() => doSend(q.text)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '14px 14px',
                    backgroundColor: 'var(--surface-card)',
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 1px 4px rgba(26, 22, 20, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = q.color;
                    e.currentTarget.style.boxShadow = `0 2px 12px ${q.color}18`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(26, 22, 20, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${q.color}12`,
                      color: q.color,
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                  >
                    {q.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: q.color,
                        fontWeight: 600,
                        marginBottom: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {q.category}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {q.text}
                    </div>
                  </div>
                </button>
              ))}
              {/* 听故事按钮 — 红色醒目主题 */}
              <button
                className="animate-fade-in-up"
                onClick={() => handleStory('灵山大佛')}
                disabled={storyLoading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '14px 14px',
                  background: 'linear-gradient(135deg, #C84B31 0%, #A33D28 100%)',
                  border: '1.5px solid rgba(200, 75, 49, 0.6)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 16px rgba(200, 75, 49, 0.25)',
                  opacity: storyLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (storyLoading) return;
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(200, 75, 49, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(200, 75, 49, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  <BookOutlined />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: 600,
                      marginBottom: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    故事
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    {storyLoading ? '生成中...' : '听一个灵山大佛的故事'}
                  </div>
                </div>
              </button>
            </div>

            {/* 底部提示 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: '#2D8B57',
                }}
              />
              也可以直接语音提问，或点击下方输入框
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {!isEmpty && renderMessages()}

        {/* 思考中指示器 */}
        {isStreaming && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div
        data-testid="input-area"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          padding: isMobile ? '10px 12px 14px' : '12px 24px 16px',
          backgroundColor: 'var(--surface-card)',
          borderTop: '1px solid var(--border-light)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* 输入框外发光效果（聚焦时） */}
        {inputFocused && (
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: 24,
              right: 24,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
              opacity: 0.3,
            }}
          />
        )}

        <VoiceInput onSend={handleSendAudio} />

        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            ref={inputRef}
            data-testid="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="寻一处胜地..."
            disabled={isStreaming}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-xl)',
              height: isMobile ? 46 : 44,
              paddingLeft: 18,
              paddingRight: 18,
              fontSize: '14px',
              backgroundColor: 'var(--gray-50)',
              border: inputFocused
                ? '1.5px solid var(--color-primary)'
                : '1.5px solid var(--border-light)',
              boxShadow: inputFocused
                ? '0 0 0 3px rgba(106, 156, 137, 0.1), inset 0 1px 2px rgba(26, 22, 20, 0.02)'
                : 'inset 0 1px 2px rgba(26, 22, 20, 0.02)',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <Button
          data-testid="send-button"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendText}
          disabled={!inputText.trim() || isStreaming}
          style={{
            borderRadius: '14px',
            width: isMobile ? 46 : 44,
            height: isMobile ? 46 : 44,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: (!inputText.trim() || isStreaming)
              ? 'var(--gray-200)'
              : 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
            border: 'none',
            boxShadow: (!inputText.trim() || isStreaming)
              ? 'none'
              : '0 2px 10px rgba(200, 75, 49, 0.3)',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '16px',
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* 错误 Toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}

      <div
        data-testid="chat-page"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile
            ? 'calc(100vh - 60px)'
            : 'calc(100vh - 60px)',
          overflow: 'hidden',
        }}
      >
        {avatarPanel}
        {chatPanel}
      </div>
    </>
  );
};

export default ChatPage;
