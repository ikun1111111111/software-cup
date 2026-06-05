import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Button, Spin, message as antMsg } from 'antd';
import { SendOutlined, BookOutlined } from '@ant-design/icons';
import ChatBubble from '../../components/DigitalHuman/ChatBubble';
import VoiceInput from '../../components/DigitalHuman/VoiceInput';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { useChatStore, Message } from '../../stores/chatStore';
import { useSSE } from '../../hooks/useSSE';
import { getStory } from '../../api/story';
import { synthesizeSpeech, type PhonemeTimestamp } from '../../api/tts';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢满意]/.test(text)) return 'smile';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

const QUICK_QUESTIONS = [
  '灵山大佛有多高？',
  '九龙灌浴表演时间？',
  '推荐历史文化路线',
  '小灵山名字的来历',
  '景区有什么好吃的？',
];

const ChatPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [phonemes, setPhonemes] = useState<PhonemeTimestamp[] | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [storyLoading, setStoryLoading] = useState(false);
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

  const { connect, disconnect } = useSSE({
    onMessage: (data) => {
      // Read latest messages from store to avoid stale closure
      const latestMessages = useChatStore.getState().messages;
      const lastMessage = latestMessages[latestMessages.length - 1];

      const event = data._event;
      if (event === 'token' && data.token) {
        if (lastMessage && lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, lastMessage.content + data.token);
        }
      } else if (event === 'chunk' && data.text) {
        // Retrieved knowledge chunks — could display as references
      } else if (event === 'faq_hit' && data.answer) {
        if (lastMessage && lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, data.answer);
        }
        setStreaming(false);
        speakText(data.answer);
      } else if (event === 'done') {
        setStreaming(false);
        if (lastMessage) {
          const detected = detectEmotion(lastMessage.content);
          setEmotion(detected);
          speakText(lastMessage.content);
        }
      } else if (event === 'error') {
        setError(data.error || '生成回答时出错');
        setStreaming(false);
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
    });
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect]);

  const handleSendText = useCallback(() => {
    doSend(inputText);
  }, [inputText, doSend]);

  const handleStory = useCallback(async (spotName: string) => {
    if (isStreaming || storyLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: `讲一个${spotName}的故事`,
      timestamp: Date.now(),
      status: 'sent',
    };
    addMessage(userMessage);
    setStoryLoading(true);
    setEmotion('think');

    try {
      const result = await getStory(spotName);
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: result.story,
        timestamp: Date.now(),
        status: 'sent',
      };
      addMessage(assistantMessage);
      setEmotion(result.emotion as Emotion);
      speakText(result.story);
    } catch {
      antMsg.error('故事获取失败，请重试');
    } finally {
      setStoryLoading(false);
    }
  }, [isStreaming, storyLoading, addMessage, speakText]);

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
    <div className="paper-texture" style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
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
          audioChunks={audioChunks}
          phonemes={phonemes}
          width={isMobile ? 180 : 320}
          height={isMobile ? 240 : 500}
          onReady={() => console.log('[ChatPage] Digital human ready')}
        />
      </div>

      {/* 全息投影底座 */}
      <div style={{
        position: 'relative',
        width: isMobile ? 160 : 240,
        height: isMobile ? 32 : 48,
        margin: '-8px auto 0',
        pointerEvents: 'none',
      }}>
        {/* 发光圆环 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: isAvatarSpeaking
            ? `radial-gradient(ellipse at center, rgba(200,75,49,0.18) 0%, rgba(200,75,49,0.06) 40%, transparent 70%)`
            : `radial-gradient(ellipse at center, rgba(26,95,180,0.15) 0%, rgba(26,95,180,0.05) 40%, transparent 70%)`,
          animation: isAvatarSpeaking
            ? 'holoSpeak 1.5s ease-in-out infinite'
            : 'holoPulse 3s ease-in-out infinite',
          transition: 'background 500ms ease',
        }} />
        {/* 底部光带 */}
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
        {/* 扩散波纹 */}
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

      {/* 数字人状态文字 */}
      <div style={{
        marginTop: 8,
        fontSize: 12,
        color: isAvatarSpeaking ? '#C84B31' : 'var(--text-tertiary)',
        fontWeight: 500,
        letterSpacing: '0.5px',
        transition: 'color 300ms ease',
        textAlign: 'center',
      }}>
        {isAvatarSpeaking ? '正在讲解...' : '等待提问'}
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
        @keyframes inkLoad {
          0% { transform: scaleY(0); transform-origin: bottom; }
          50% { transform: scaleY(1); transform-origin: bottom; }
          50.01% { transform-origin: top; }
          100% { transform: scaleY(0); transform-origin: top; }
        }
      `}</style>

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
        className="paper-texture"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isMobile ? '8px 12px 16px' : '16px 24px 20px',
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

            {/* Quick Question Chips — 印章风格 */}
            <div className="scroll-tags" style={{
              justifyContent: 'center',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
            }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={q}
                  className={`btn-seal animate-fade-in-up stagger-${i + 1}`}
                  onClick={() => doSend(q)}
                >
                  {q}
                </button>
              ))}
              <button
                className="btn-seal animate-fade-in-up stagger-4"
                onClick={() => handleStory('灵山大佛')}
                disabled={storyLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: storyLoading ? 0.6 : 1,
                }}
              >
                <BookOutlined />
                {storyLoading ? '故事生成中...' : '听故事'}
              </button>
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
            gap: '10px',
            padding: '8px 16px',
            color: 'var(--text-tertiary)',
            fontSize: '13px',
          }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 16 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 4,
                  height: 16,
                  background: '#2A2520',
                  borderRadius: 2,
                  animation: 'inkLoad 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
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
              : 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
            border: 'none',
            boxShadow: (!inputText.trim() || isStreaming)
              ? undefined
              : '0 2px 8px rgba(200, 75, 49, 0.3)',
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
