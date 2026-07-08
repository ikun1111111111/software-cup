import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HistoryScene, { type Era } from '../../components/History/HistoryScene';
import HistoryGuide from '../../components/History/HistoryGuide';
import GuideBubble from '../../components/Galgame/GuideBubble';
import { getDynastyDataV2 } from '../../data/eraData';
import { useDigitalHuman } from '../../components/tourist/DigitalHumanProvider';
import { useChatStore, Message } from '../../stores/chatStore';
import { useSSE } from '../../hooks/useSSE';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

interface EraOption {
  id: Era;
  name: string;
  subtitle: string;
  color: string;
  seal: string;
}

const ERA_OPTIONS: EraOption[] = [
  {
    id: 'tang',
    name: '盛唐',
    subtitle: '佛光普照 · 梵音缭绕',
    color: '#B87333',
    seal: '/image/history/seal-tang.png',
  },
  {
    id: 'song',
    name: '北宋',
    subtitle: '烟雨江南 · 禅意空灵',
    color: '#6A9C89',
    seal: '/image/history/seal-song.png',
  },
  {
    id: 'ming',
    name: '大明',
    subtitle: '梵宫巍峨 · 盛世梵刹',
    color: '#C84B31',
    seal: '/image/history/seal-ming.png',
  },
];

const HistoryExplore: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSpeaking, speak, stop, setEmotion } = useDigitalHuman();
  const returnToParam = searchParams.get('returnTo') || '';
  const returnPath = returnToParam.startsWith('/chat') ? returnToParam : '/chat';

  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unlockedCards, setUnlockedCards] = useState<Set<string>>(new Set());
  const [guideText, setGuideText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);

  const {
    currentSessionId,
    isStreaming,
    addMessage,
    updateMessage,
    updateMessageStatus,
    setStreaming,
    setCurrentSession,
    getHistory,
  } = useChatStore();

  /* ---------- SSE 内联问答 ---------- */
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
          const updated = lastMessage.content + (msg.data.token || '');
          latestUpdateMessage(lastMessage.id, updated);
          setGuideText(updated);
        }
      } else if (msg.event === 'faq_hit') {
        setStreaming(false);
        setIsChatStreaming(false);
        if (lastMessage) {
          const answer = msg.data.answer || '';
          latestUpdateMessage(lastMessage.id, answer);
          latestUpdateStatus(lastMessage.id, 'sent');
          setGuideText(answer);
          setEmotion(detectEmotion(answer));
          speak(answer, { emotion: detectEmotion(answer) });
        }
      } else if (msg.event === 'done') {
        setStreaming(false);
        setIsChatStreaming(false);
        if (lastMessage) {
          const finalContent = lastMessage.content || msg.data?.answer || '';
          latestUpdateMessage(lastMessage.id, finalContent);
          latestUpdateStatus(lastMessage.id, 'sent');
          setGuideText(finalContent);
          setEmotion(detectEmotion(finalContent));
          speak(finalContent, { emotion: detectEmotion(finalContent) });
        }
      } else if (msg.event === 'error') {
        setStreaming(false);
        setIsChatStreaming(false);
        setGuideText(msg.data.error || '生成回答时出错，请稍后重试');
        if (lastMessage) {
          latestUpdateStatus(lastMessage.id, 'error');
        }
      }
    },
    onError: () => {
      setStreaming(false);
      setIsChatStreaming(false);
      setGuideText('连接错误，请稍后重试');
    },
    onClose: () => {
      setStreaming(false);
      setIsChatStreaming(false);
    },
  });

  const narrate = useCallback(
    (text: string, opts?: { emotion?: Emotion }) => {
      setGuideText(text);
      setIsTyping(true);
      setBubbleKey((k) => k + 1);
      speak(text, { emotion: opts?.emotion });
    },
    [speak],
  );

  const askInline = useCallback(
    (question: string) => {
      if (!question.trim() || isStreaming) return;

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: question.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };
      addMessage(userMessage);

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };
      addMessage(assistantMessage);

      setGuideText('小景正在思考…');
      setIsTyping(false);
      setIsChatStreaming(true);
      setStreaming(true);
      stop();

      const sid = currentSessionId || `session_${Date.now()}`;
      if (!currentSessionId) setCurrentSession(sid);

      connect('/api/chat/stream', {
        session_id: sid,
        question: question.trim(),
        stream: true,
        history: getHistory(5),
      });
    },
    [isStreaming, currentSessionId, addMessage, setStreaming, stop, connect, getHistory, setCurrentSession],
  );

  const handleSelectEra = useCallback(
    (era: Era) => {
      setIsTransitioning(true);
      stop();
      setTimeout(() => {
        setSelectedEra(era);
        setIsTransitioning(false);
        const data = getDynastyDataV2(era);
        if (data?.welcomeText) {
          narrate(data.welcomeText, { emotion: 'smile' });
        }
      }, 400);
    },
    [narrate, stop],
  );

  const handleReturnModern = useCallback(() => {
    stop();
    disconnect();
    setIsChatStreaming(false);
    navigate(returnPath);
  }, [stop, disconnect, navigate, returnPath]);

  const handleAskQuestion = useCallback(
    (question: string) => {
      stop();
      askInline(question);
    },
    [stop, askInline],
  );

  const handleCardSelect = useCallback((cardId: string) => {
    setUnlockedCards((prev) => new Set([...prev, cardId]));
  }, []);

  const handleSegmentSpeak = useCallback(
    async (text: string, segmentEmotion: string) => {
      setEmotion(segmentEmotion as Emotion);
      setGuideText(text);
      setIsTyping(true);
      setBubbleKey((k) => k + 1);
      return new Promise<void>((resolve) => {
        speak(text, {
          emotion: segmentEmotion as Emotion,
          onComplete: resolve,
          onError: resolve,
        });
      });
    },
    [speak, setEmotion],
  );

  const handleHotspotClick = useCallback(() => {
    setGuideText('');
    setIsTyping(false);
  }, []);

  const handleBackToOverview = useCallback(() => {
    stop();
    setGuideText('');
    setIsTyping(false);
  }, [stop]);

  const handleSkipSpeaking = useCallback(() => {
    stop();
    setIsTyping(false);
  }, [stop]);

  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;
  useEffect(() => {
    return () => {
      disconnectRef.current();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEra) {
          handleReturnModern();
        } else {
          navigate(returnPath);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleReturnModern, navigate, returnPath, selectedEra]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#141210',
      }}
    >
      <style>{`
        .history-exit-button {
          position: absolute;
          top: clamp(22px, 3vw, 38px);
          left: clamp(22px, 3vw, 42px);
          z-index: 80;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 46px;
          padding: 0 18px 0 12px;
          border: 1px solid rgba(245, 230, 200, 0.24);
          border-radius: 999px;
          color: rgba(255, 250, 236, 0.92);
          background:
            linear-gradient(90deg, rgba(255,250,236,0.13), rgba(255,250,236,0.05)),
            rgba(22, 18, 14, 0.42);
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(14px) saturate(116%);
          -webkit-backdrop-filter: blur(14px) saturate(116%);
          cursor: pointer;
          font-family: var(--font-serif), 'Noto Serif SC', 'Source Han Serif SC', serif;
          font-weight: 800;
          letter-spacing: 0.08em;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .history-exit-button:hover {
          transform: translateY(-2px);
          border-color: rgba(245, 230, 200, 0.46);
          background:
            linear-gradient(90deg, rgba(255,250,236,0.20), rgba(255,250,236,0.08)),
            rgba(22, 18, 14, 0.58);
          box-shadow:
            0 22px 52px rgba(0, 0, 0, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .history-exit-button__mark {
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          border-radius: 50%;
          color: #1b1510;
          background: linear-gradient(135deg, #f4dfad, #c99a4e);
          box-shadow: 0 0 18px rgba(244, 223, 173, 0.28);
          font-size: 19px;
          line-height: 1;
        }

        .history-exit-button__text {
          display: inline-grid;
          gap: 1px;
          text-align: left;
        }

        .history-exit-button__text strong {
          font-size: 15px;
          line-height: 1.1;
        }

        .history-exit-button__text small {
          color: rgba(255, 250, 236, 0.58);
          font-size: 11px;
          letter-spacing: 0.16em;
          line-height: 1.1;
        }
      `}</style>

      <button className="history-exit-button" onClick={handleReturnModern} aria-label="退出历史穿越并返回问我">
        <span className="history-exit-button__mark">‹</span>
        <span className="history-exit-button__text">
          <strong>退出穿越</strong>
          <small>返回问我</small>
        </span>
      </button>

      {/* 朝代背景 */}
      {selectedEra && (
        <HistoryScene
          era={selectedEra}
          isVisible={!isTransitioning}
          showSeal={true}
          showTitle={true}
        />
      )}

      {/* 朝代选择覆盖层 */}
      {!selectedEra && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            background: `
              radial-gradient(ellipse at 50% 40%, rgba(26,22,20,0.1) 0%, rgba(26,22,20,0.5) 70%),
              linear-gradient(180deg, rgba(26,22,20,0.45) 0%, rgba(26,22,20,0.25) 40%, rgba(26,22,20,0.45) 100%)
            `,
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 400ms ease',
            pointerEvents: isTransitioning ? 'none' : 'auto',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
                fontSize: 52,
                color: '#F5F0E8',
                letterSpacing: '0.25em',
                marginBottom: 16,
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              时空穿越
            </h1>
            <p
              style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: 18,
                color: 'rgba(245,240,232,0.7)',
                letterSpacing: '0.15em',
              }}
            >
              选择朝代，让小景带你亲眼看看那时的灵山
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 40,
              alignItems: 'stretch',
            }}
          >
            {ERA_OPTIONS.map((era) => (
              <button
                key={era.id}
                onClick={() => handleSelectEra(era.id)}
                style={{
                  width: 260,
                  height: 360,
                  borderRadius: 24,
                  border: `2px solid ${era.color}60`,
                  background: 'rgba(20, 18, 16, 0.55)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 24,
                  cursor: 'pointer',
                  transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  color: '#F5F0E8',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = era.color;
                  (e.currentTarget as HTMLElement).style.background = 'rgba(20, 18, 16, 0.75)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.borderColor = `${era.color}60`;
                  (e.currentTarget as HTMLElement).style.background = 'rgba(20, 18, 16, 0.55)';
                }}
              >
                <img
                  src={era.seal}
                  alt=""
                  style={{ width: 80, height: 80, objectFit: 'contain', opacity: 0.9 }}
                />
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
                      fontSize: 42,
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      marginBottom: 12,
                    }}
                  >
                    {era.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      fontSize: 15,
                      color: 'rgba(245,240,232,0.65)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {era.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 朝代探索 Guide */}
      {selectedEra && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 400ms ease',
            pointerEvents: isTransitioning ? 'none' : 'auto',
          }}
        >
          <HistoryGuide
            era={selectedEra}
            isVisible={true}
            onAskQuestion={handleAskQuestion}
            onReturnModern={handleReturnModern}
            onCardSelect={handleCardSelect}
            onSegmentSpeak={handleSegmentSpeak}
            onSkipSpeaking={handleSkipSpeaking}
            onHotspotClick={handleHotspotClick}
            onBackToOverview={handleBackToOverview}
            unlockedCards={unlockedCards}
            disabled={isChatStreaming || isStreaming}
          />
        </div>
      )}

      {/* 小景解说气泡 —— 仅在已选择朝代后显示，紧贴小景右侧头部高度 */}
      {selectedEra && !!guideText && (
        <GuideBubble
          key={bubbleKey}
          speakerName="小景"
          text={guideText}
          isTyping={isTyping}
          typingSpeed={22}
          visible
          onSkip={handleSkipSpeaking}
          style={{
            position: 'absolute',
            left: '21%',
            top: '22%',
            maxWidth: 360,
            zIndex: 110,
          }}
        />
      )}


      {/* 转场遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          pointerEvents: 'none',
          background: '#0c0a08',
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      />
    </div>
  );
};


function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢满意]/.test(text)) return 'smile';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

export default HistoryExplore;


