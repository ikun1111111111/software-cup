import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Button, Spin } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/DigitalHuman/ChatBubble';
import VoiceInput from '../../components/DigitalHuman/VoiceInput';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { useChatStore, Message } from '../../stores/chatStore';
import { useSSE } from '../../hooks/useSSE';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢满意]/.test(text)) return 'positive';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'negative';
  if (/[？?什么为什么怎么]/.test(text)) return 'thinking';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprised';
  return 'neutral';
}

const QUICK_QUESTIONS = [
  '灵山大佛有多高？',
  '推荐游玩路线',
  '附近有什么美食？',
];

const ChatPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    currentSessionId,
    isStreaming,
    error,
    addMessage,
    updateMessage,
    setStreaming,
    setCurrentSession,
    setError,
  } = useChatStore();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const { connect, disconnect } = useSSE({
    onMessage: (data) => {
      if (data.type === 'chunk') {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, lastMessage.content + data.content);
        }
      } else if (data.type === 'done') {
        setStreaming(false);
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          const detected = detectEmotion(lastMessage.content);
          setEmotion(detected);
          setIsAvatarSpeaking(true);
          setTimeout(() => setIsAvatarSpeaking(false), 3000);
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

  const doSend = useCallback((text: string) => {
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
    setEmotion('thinking');

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

    connect(`/api/chat/stream?session=${currentSessionId}&message=${encodeURIComponent(text.trim())}`);
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect]);

  const handleSendText = useCallback(() => {
    doSend(inputText);
  }, [inputText, doSend]);

  const handleSendAudio = useCallback((audioBlob: Blob) => {
    if (isStreaming) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: '[语音消息]',
      timestamp: Date.now(),
      status: 'sent',
    };

    addMessage(userMessage);
    setEmotion('thinking');

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
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const isEmpty = messages.length === 0;

  // Desktop: side-by-side layout (avatar left, chat right)
  // Mobile: stacked layout (avatar top, chat below)
  const avatarPanel = (
    <div style={{
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
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(26,95,180,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,136,46,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-float">
        <DigitalHuman
          emotion={emotion}
          isSpeaking={isAvatarSpeaking}
          width={isMobile ? 180 : 320}
          height={isMobile ? 240 : 500}
          onReady={() => console.log('[ChatPage] Digital human ready')}
        />
      </div>

    </div>
  );

  const chatPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* Message List */}
      <div
        data-testid="message-list"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? '8px 12px 16px' : '16px 24px 20px',
          backgroundColor: 'var(--surface-bg)',
        }}
      >
        {isEmpty && (
          <div className="animate-fade-in-up" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            paddingTop: isMobile ? '8px' : '24px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                你好！我是灵山胜境数字人导游
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                lineHeight: 1.5,
              }}>
                可以为你介绍景点、推荐路线、解答问题
              </div>
            </div>

            {/* Quick Question Chips */}
            <div className="scroll-tags" style={{
              justifyContent: 'center',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
            }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={q}
                  className={`btn-pill animate-fade-in-up stagger-${i + 1}`}
                  onClick={() => doSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} isUser={msg.role === 'user'} />
        ))}

        {isStreaming && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            color: 'var(--text-tertiary)',
            fontSize: '13px',
          }}>
            <Spin size="small" />
            <span>正在思考...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div data-testid="error-message" style={{
          padding: '8px 24px',
          color: 'var(--color-error)',
          backgroundColor: 'var(--color-error-bg)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {error}
        </div>
      )}

      {/* Input Area */}
      <div
        data-testid="input-area"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          padding: isMobile ? '10px 12px' : '12px 24px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--surface-card)',
          flexShrink: 0,
        }}
      >
        <VoiceInput onSend={handleSendAudio} />
        <Input
          data-testid="text-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={isStreaming}
          style={{
            flex: 1,
            borderRadius: 'var(--radius-xl)',
            height: isMobile ? 44 : 40,
          }}
        />
        <Button
          data-testid="send-button"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendText}
          disabled={!inputText.trim() || isStreaming}
          style={{
            borderRadius: 'var(--radius-xl)',
            height: isMobile ? 44 : 40,
            paddingLeft: isMobile ? '14px' : '18px',
            paddingRight: isMobile ? '14px' : '18px',
            background: (!inputText.trim() || isStreaming)
              ? undefined
              : 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
            border: 'none',
            boxShadow: (!inputText.trim() || isStreaming)
              ? undefined
              : '0 2px 8px rgba(26, 95, 180, 0.3)',
          }}
        >
          {isMobile ? '' : '发送'}
        </Button>
      </div>
    </div>
  );

  return (
    <div data-testid="chat-page" style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile
        ? 'calc(100vh - 56px - 56px)'
        : 'calc(100vh - 56px - 48px)',
    }}>
      {avatarPanel}
      {chatPanel}
    </div>
  );
};

export default ChatPage;
