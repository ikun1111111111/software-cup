import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageOutlined, CloseOutlined, SoundOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { usePageGuide } from '../../contexts/PageGuideContext';
import DigitalHuman from './DigitalHuman';

/**
 * AutoGuideEngine — 页面级自动讲解气泡
 *
 * 进入页面时弹出引导气泡，提供三个操作：
 * - "需要讲解" → TTS 播放讲解词 + 数字人表情/手势联动
 * - "不用了" → 收起，同会话不再弹出
 * - "随便问问" → 展开提问框
 */

const AutoGuideEngine: React.FC<{
  /** 当用户点击"需要讲解"时触发，传入讲解文字 */
  onSpeak?: (text: string) => void;
  /** 当用户点击"随便问问"时触发 */
  onQuestion?: () => void;
}> = ({ onSpeak, onQuestion }) => {
  const { config, guideState, dismissGuide, startSpeaking, finishSpeaking, openQuestion } = usePageGuide();
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const typingRef = useRef(false);

  // 进入动画
  useEffect(() => {
    if (guideState === 'prompting') {
      setVisible(true);
      // 文字打字效果
      setTimeout(() => setTextVisible(true), 200);
    } else {
      setVisible(false);
      setTextVisible(false);
    }
  }, [guideState]);

  const handleSpeak = useCallback(() => {
    if (!config) return;
    startSpeaking();
    onSpeak?.(config.welcomeText);
    // 自动结束
    const dur = Math.max(3000, config.welcomeText.length * 150);
    setTimeout(() => finishSpeaking(), dur);
  }, [config, onSpeak, startSpeaking, finishSpeaking]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    dismissGuide();
  }, [dismissGuide]);

  const handleQuestion = useCallback(() => {
    setVisible(false);
    openQuestion();
    onQuestion?.();
  }, [openQuestion, onQuestion]);

  if (!config || !visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 300,
        background: 'rgba(253, 251, 247, 0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(26, 22, 20, 0.12)',
        border: '1px solid rgba(106, 156, 137, 0.15)',
        overflow: 'hidden',
        zIndex: 50,
        animation: 'guideSlideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: "'Noto Serif SC', 'STSong', serif",
      }}
    >
      {/* 头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(106,156,137,0.08) 0%, rgba(106,156,137,0.03) 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageOutlined style={{ fontSize: 12, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2A2520' }}>小灵</span>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9E988E', fontSize: 14, padding: 4,
          }}
        >
          <CloseOutlined />
        </button>
      </div>

      {/* 讲解文字 */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: '#5C554C',
          margin: 0,
          minHeight: textVisible ? 60 : 0,
          transition: 'opacity 200ms',
          opacity: textVisible ? 1 : 0,
        }}>
          {config.guidePrompt}
        </p>
      </div>

      {/* 操作按钮 */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '0 14px 14px',
      }}>
        <button
          onClick={handleSpeak}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 0',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Noto Serif SC', serif",
            letterSpacing: 1,
          }}
        >
          <SoundOutlined /> 需要讲解
        </button>
        <button
          onClick={handleQuestion}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid rgba(106,156,137,0.3)',
            background: 'transparent',
            color: '#6A9C89',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Noto Serif SC', serif",
            letterSpacing: 1,
          }}
        >
          <QuestionCircleOutlined /> 随便问问
        </button>
      </div>
    </div>
  );
};

export default AutoGuideEngine;
