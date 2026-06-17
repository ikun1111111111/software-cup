import React, { useCallback, useRef, useState } from 'react';
import { CloseOutlined, SendOutlined, SoundOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { VRMManager } from '../VRM/VRMManager';
import { useSSE } from '../../hooks/useSSE';
import { useChatStore, Message } from '../../stores/chatStore';
import { matchPageGuide } from '../../config/pageGuide';

import type { Emotion } from './EmotionController';

type GuideState = 'prompt' | 'speaking' | 'question' | 'dismissed' | 'idle';

function detectEmotion(text: string): Emotion {
  if (/[开心高兴棒好赞喜欢欢迎精彩美好]/.test(text)) return 'smile';
  if (/[抱歉遗憾难过问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

const DISMISS_PREFIX = 'guide_demo_dismissed_';

const DemoGuide: React.FC = () => {
  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const inputRef = useRef<any>(null);

  const pathname = window.location.pathname;
  const config = matchPageGuide(pathname);

  const { messages, addMessage, updateMessage, updateMessageStatus, setStreaming, currentSessionId, setCurrentSession, isStreaming, getHistory } = useChatStore();

  // Ensure session
  if (!currentSessionId) setCurrentSession(`demo_session_${Date.now()}`);

  const { connect } = useSSE({
    onMessage: (msg) => {
      const { messages: latest, updateMessage: upd, updateMessageStatus: updSt } = useChatStore.getState();
      const last = latest[latest.length - 1];
      if (!last) return;

      if (msg.event === 'token') {
        if (last.role === 'assistant') upd(last.id, last.content + (msg.data.token || ''));
      } else if (msg.event === 'done') {
        setStreaming(false);
        updSt(last.id, 'sent');
        VRMManager.speak(last.content, detectEmotion(last.content));
      } else if (msg.event === 'error') {
        setStreaming(false);
        updSt(last.id, 'error');
      }
    },
    onError: () => setStreaming(false),
    onClose: () => setStreaming(false),
  });

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: text.trim(), timestamp: Date.now(), status: 'sent' });
    addMessage({ id: `msg_${Date.now() + 1}`, role: 'assistant', content: '', timestamp: Date.now(), status: 'sending' });
    setStreaming(true);
    setQuestionsAsked(q => q + 1);
    setGuideState('question');

    connect('/api/chat/stream', {
      session_id: currentSessionId,
      question: text.trim(),
      stream: true,
      history: getHistory(5),
    });
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect, getHistory]);

  const handleSpeak = useCallback(() => {
    if (!config) return;
    VRMManager.speak(config.welcomeText, 'smile');
    setGuideState('speaking');
    const dur = Math.max(3000, config.welcomeText.length * 150);
    setTimeout(() => setGuideState('idle'), dur);
  }, [config]);

  const handleDismiss = useCallback(() => {
    setGuideState('dismissed');
    if (config) sessionStorage.setItem(`${DISMISS_PREFIX}${config.pageId}`, '1');
  }, [config]);

  // Auto-dismiss if already dismissed this session
  if (config && sessionStorage.getItem(`${DISMISS_PREFIX}${config.pageId}`)) return null;

  if (!config) return null;

  // Show reset button when dismissed
  if (guideState === 'dismissed') {
    return (
      <button
        onClick={() => setGuideState('prompt')}
        style={{
          position: 'fixed', bottom: 110, right: 20, zIndex: 1001,
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
          border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(106,156,137,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        💬
      </button>
    );
  }

  const lastMsg = messages[messages.length - 1];

  return (
    <div style={{
      position: 'fixed', bottom: 100, right: 20, zIndex: 1001,
      width: 320, animation: 'guideSlideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '16px 16px 0 0',
        background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>小灵 · 智能导览</span>
        </div>
        <button onClick={handleDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.8)', fontSize: 14, padding: 4,
        }}>
          <CloseOutlined />
        </button>
      </div>

      {/* 内容区 */}
      <div style={{
        background: 'rgba(253, 251, 247, 0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 4px 24px rgba(26, 22, 20, 0.12)',
        border: '1px solid rgba(106, 156, 137, 0.15)',
        borderTop: 'none',
        overflow: 'hidden',
      }}>
        {/* 引导气泡（初始状态） */}
        {guideState === 'prompt' && (
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#5C554C', margin: '0 0 12px' }}>
              {config.guidePrompt}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSpeak} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 1,
              }}>
                <SoundOutlined /> 需要讲解
              </button>
              <button onClick={() => { setGuideState('question'); inputRef.current?.focus(); }} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8,
                border: '1px solid rgba(106,156,137,0.3)', background: 'transparent', color: '#6A9C89',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 1,
              }}>
                <QuestionCircleOutlined /> 随便问问
              </button>
            </div>
          </div>
        )}

        {/* 讲解中 */}
        {guideState === 'speaking' && (
          <div style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 12, borderRadius: 3,
                  background: '#6A9C89',
                  animation: `soundBar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#6A9C89' }}>正在讲解...</p>
            <style>{`@keyframes soundBar { from { height: 6px; } to { height: 16px; } }`}</style>
          </div>
        )}

        {/* 提问框 */}
        {guideState === 'question' && (
          <>
            {/* 回答区 */}
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '10px 14px', minHeight: 60 }}>
              {messages.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9E988E', textAlign: 'center', margin: 0, padding: '8px 0' }}>
                  有什么关于当前页面的问题？
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      maxWidth: '85%', padding: '6px 12px', borderRadius: 12,
                      fontSize: 12, lineHeight: 1.6,
                      background: msg.role === 'user' ? '#6A9C89' : '#F0EDE7',
                      color: msg.role === 'user' ? '#fff' : '#2A2520',
                      ...(msg.role === 'assistant' ? { borderLeft: '2px solid #6A9C89' } : {}),
                    }}>
                      {msg.content || (msg.role === 'assistant' && isStreaming ? '正在回答...' : '')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 快捷问题 */}
            {messages.length === 0 && config.quickQuestions.length > 0 && (
              <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {config.quickQuestions.map((q) => (
                  <button key={q} onClick={() => doSend(q)} style={{
                    padding: '5px 12px', borderRadius: 16, fontSize: 12,
                    border: '1px solid rgba(106,156,137,0.25)', background: 'transparent',
                    color: '#6A9C89', cursor: 'pointer',
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 输入区 */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && doSend(inputText)}
                placeholder="输入问题..."
                disabled={isStreaming}
                style={{
                  flex: 1, height: 32, padding: '0 10px', borderRadius: 16,
                  border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, outline: 'none',
                  background: '#F8F6F2',
                }}
              />
              <button onClick={() => doSend(inputText)} disabled={!inputText.trim() || isStreaming} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: inputText.trim() && !isStreaming ? '#C84B31' : '#ccc',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SendOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
          </>
        )}

        {/* 空闲态（讲解完/问答完） */}
        {guideState === 'idle' && (
          <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
            <button onClick={() => setGuideState('prompt')} style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              border: '1px solid rgba(106,156,137,0.3)', background: 'transparent',
              color: '#6A9C89', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              再听一次讲解
            </button>
            <button onClick={() => { setGuideState('question'); inputRef.current?.focus(); }} style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              border: '1px solid rgba(106,156,137,0.3)', background: 'transparent',
              color: '#6A9C89', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              继续提问
            </button>
          </div>
        )}
      </div>

      {/* 快捷问题统计 */}
      {questionsAsked > 0 && (
        <div style={{
          marginTop: 4, padding: '4px 8px', textAlign: 'center',
          fontSize: 10, color: '#9E988E',
        }}>
          已提问 {questionsAsked} 次
        </div>
      )}
    </div>
  );
};

export default DemoGuide;
