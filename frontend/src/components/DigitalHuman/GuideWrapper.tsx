import React, { useCallback, useState } from 'react';
import { usePageGuide, GuideState } from '../../contexts/PageGuideContext';
import { synthesizeSpeech } from '../../api/tts';
import AutoGuideEngine from './AutoGuideEngine';
import InPageQuestionBox from './InPageQuestionBox';
import type { Emotion } from './EmotionController';

/**
 * GuideWrapper — 统一页面导览入口
 *
 * 包裹在任意页面外层，提供：
 * 1. 自动讲解气泡（进入页面弹出引导）
 * 2. 页面内提问框（复用 RAG + TTS 链路）
 * 3. speakText 回调（供子页面调用，触发数字人讲解）
 *
 * 用法：
 *   <GuideWrapper pageId="home">
 *     <YourPageContent />
 *   </GuideWrapper>
 */

export interface GuideWrapperProps {
  pageId: string;
  children: React.ReactNode;
  /** 数字人说话回调（由页面已有的 DigitalHuman 接收） */
  onSpeak?: (text: string, emotion?: Emotion) => void;
  /** 位置 */
  position?: 'bottom-right' | 'top-right';
}

/** 简单关键词情感检测（复用 ChatPage 逻辑） */
function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢欢迎精彩美好]/.test(text)) return 'neutral';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprise';
  if (/[历史文化传统由来传说]/.test(text)) return 'think';
  return 'neutral';
}

const GuideWrapper: React.FC<GuideWrapperProps> = ({
  pageId,
  children,
  onSpeak,
  position = 'bottom-right',
}) => {
  const { guideState, config } = usePageGuide();
  const [speakingText, setSpeakingText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 核心 speakText 函数 — 调用 TTS + 驱动数字人
  const handleSpeak = useCallback(async (text: string, emotion?: Emotion) => {
    const detected = emotion || detectEmotion(text);
    setSpeakingText(text);
    setIsSpeaking(true);

    // 调用外部 onSpeak 让页面的 DigitalHuman 开始说话
    onSpeak?.(text, detected);

    // 同时走 TTS 生成音频
    try {
      const result = await synthesizeSpeech(text);
      if (result.audioChunks.length > 0) {
        // 页面负责用 audioChunks 驱动 DigitalHuman 的 AudioSync
        window.dispatchEvent(new CustomEvent('guide:audio-ready', {
          detail: { audioChunks: result.audioChunks, phonemes: result.phonemes }
        }));
      }
    } catch {
      // TTS 失败不影响文字展示
    }

    const dur = Math.max(2000, text.length * 150);
    setTimeout(() => setIsSpeaking(false), dur);
  }, [onSpeak]);

  const handleAutoSpeak = useCallback((text: string) => {
    handleSpeak(text, 'neutral');
  }, [handleSpeak]);

  const positionStyle = position === 'bottom-right'
    ? { bottom: 100, right: 20 }
    : { top: 80, right: 20 };

  return (
    <>
      {children}

      {/* 讲解气泡 / 提问框 — 绝对定位在页面上方 */}
      <div
        style={{
          position: 'fixed',
          zIndex: 1001,
          ...positionStyle,
        }}
      >
        {guideState === 'prompting' && (
          <AutoGuideEngine
            onSpeak={handleAutoSpeak}
            onQuestion={() => {}}
          />
        )}

        {guideState === 'questioning' && (
          <InPageQuestionBox
            onSpeak={handleSpeak}
            onClose={() => {}}
            quickQuestions={config?.quickQuestions}
          />
        )}
      </div>
    </>
  );
};

export default GuideWrapper;
