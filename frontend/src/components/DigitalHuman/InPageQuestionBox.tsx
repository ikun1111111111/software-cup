import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SendOutlined, CloseOutlined } from '@ant-design/icons';
import { useSSE } from '../../hooks/useSSE';
import { useChatStore, Message } from '../../stores/chatStore';
import { synthesizeSpeech } from '../../api/tts';
import ChatBubble from './ChatBubble';
import { usePageGuide } from '../../contexts/PageGuideContext';
import { Emotion } from './EmotionController';

/**
 * InPageQuestionBox — 页面内轻量提问框
 *
 * 复用 ChatPage 的 SSE + TTS 链路，但不复制整个 UI。
 * 提问后回答走流式渲染，同时触发数字人 TTS + 表情。
 */

interface InPageQuestionBoxProps {
  onSpeak: (text: string, emotion?: Emotion) => void;
  onClose: () => void;
  quickQuestions?: string[];
}

function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢]/.test(text)) return 'neutral';
  if (/[抱歉遗憾难过问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

const InPageQuestionBox: React.FC<InPageQuestionBoxProps> = ({
  onSpeak,
  onClose,
  quickQuestions = [],
}) => {
  const { config } = usePageGuide();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<any>(null);

  const {
    messages,
    currentSessionId,
    isStreaming,
    addMessage,
    updateMessage,
    updateMessageStatus,
    setStreaming,
    setCurrentSession,
    setError,
    getHistory,
  } = useChatStore();

  useEffect(() => {
    if (!currentSessionId) setCurrentSession(`session_${Date.now()}`);
    inputRef.current?.focus();
  }, [currentSessionId, setCurrentSession]);

  const { connect } = useSSE({
    onMessage: (msg) => {
      const { messages: latest, updateMessage: upd, updateMessageStatus: updSt } = useChatStore.getState();
      const last = latest[latest.length - 1];
      if (!last) return;

      if (msg.event === 'token') {
        if (last.role === 'assistant') {
          upd(last.id, last.content + (msg.data.token || ''));
        }
      } else if (msg.event === 'done') {
        setStreaming(false);
        updSt(last.id, 'sent');
        const emotion = detectEmotion(last.content);
        onSpeak(last.content, emotion);
      } else if (msg.event === 'error') {
        setError(msg.data.error || '回答失败');
        setStreaming(false);
        updSt(last.id, 'error');
      }
    },
    onError: () => { setError('连接错误'); setStreaming(false); },
    onClose: () => setStreaming(false),
  });

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: text.trim(), timestamp: Date.now(), status: 'sent' });
    addMessage({ id: `msg_${Date.now() + 1}`, role: 'assistant', content: '', timestamp: Date.now(), status: 'sending' });
    setStreaming(true);
    onSpeak(text.trim(), 'think');

    connect('/api/chat/stream', {
      session_id: currentSessionId,
      question: text.trim(),
      stream: true,
      history: getHistory(5),
    });
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect, getHistory, onSpeak]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    doSend(inputText);
    setInputText('');
  }, [inputText, doSend]);

  const allQuestions = quickQuestions.length > 0
    ? quickQuestions
    : (config?.quickQuestions || []);

  const showMessages = messages.length > 0;

  return (
    <div
      style={{
        background: 'rgba(253, 251, 247, 0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(26, 22, 20, 0.12)',
        border: '1px solid rgba(106, 156, 137, 0.15)',
        overflow: 'hidden',
        zIndex: 50,
        animation: 'guideSlideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: "'Noto Serif SC', 'STSong', serif",
        maxWidth: 380,
      }}
    >
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(106,156,137,0.08), rgba(106,156,137,0.03))',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#2A2520' }}>提问</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9E988E', fontSize: 14, padding: 4,
        }}>
          <CloseOutlined />
        </button>
      </div>

      {/* 回答区 */}
      <div style={{
        maxHeight: 260, overflowY: 'auto', padding: '10px 14px',
        borderBottom: showMessages ? '1px solid rgba(0,0,0,0.04)' : 'none',
      }}>
        {showMessages
          ? messages.map((msg, i) => (
              <ChatBubble key={msg.id} message={msg} isUser={msg.role === 'user'} source={msg.source} />
            ))
          : (
              <p style={{ fontSize: 12, color: '#9E988E', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                有什么关于当前页面的问题？
              </p>
            )
        }
      </div>

      {/* 快捷问题 */}
      {!showMessages && allQuestions.length > 0 && (
        <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allQuestions.map((q) => (
            <button
              key={q}
              onClick={() => doSend(q)}
              style={{
                padding: '5px 12px', borderRadius: 16, fontSize: 12,
                border: '1px solid rgba(106,156,137,0.25)',
                background: 'transparent', color: '#6A9C89',
                cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 14px',
        borderTop: '1px solid rgba(0,0,0,0.04)',
      }}>
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="输入问题..."
          disabled={isStreaming}
          style={{
            flex: 1, height: 34, padding: '0 12px', borderRadius: 17,
            border: '1px solid rgba(0,0,0,0.08)', fontSize: 13,
            outline: 'none', background: '#F8F6F2',
            fontFamily: "'Noto Serif SC', serif",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isStreaming}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: inputText.trim() && !isStreaming
              ? 'linear-gradient(135deg, #C84B31, #E85D3A)'
              : '#ccc',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SendOutlined style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
};

export default InPageQuestionBox;
