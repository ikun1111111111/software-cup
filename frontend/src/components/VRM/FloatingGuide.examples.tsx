/**
 * FloatingGuide 使用示例
 *
 * 本文件展示如何在各页面中使用 FloatingGuide 组件
 */

import React, { useRef, useEffect } from 'react';
import { FloatingGuide, FloatingGuideRef } from '../components/vrm/FloatingGuide';
import { VRMManager } from '../components/vrm/VRMManager';

// ============================================================
// 示例 1：首页使用
// ============================================================

export const HomePageExample: React.FC = () => {
  const guideRef = useRef<FloatingGuideRef>(null);

  // 页面加载完成后，可以主动触发讲解
  useEffect(() => {
    // 3秒后主动推荐
    const timer = setTimeout(() => {
      guideRef.current?.speak('为您推荐灵山大佛，来灵山不可错过', 'happy');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F0' }}>
      {/* 页面内容 */}
      <div style={{ padding: '40px 24px' }}>
        <h1>灵山胜境</h1>
        <p>一步一景 · 一景一画</p>
      </div>

      {/* 数字人浮窗 - 首页上下文 */}
      <FloatingGuide
        ref={guideRef}
        pageContext="home"
        autoWelcome={true}
        welcomeDelay={800}
        position="bottom-right"
      />
    </div>
  );
};

// ============================================================
// 示例 2：景点详情页使用
// ============================================================

interface AttractionDetailPageProps {
  spotId: string;
  spotName: string;
}

export const AttractionDetailExample: React.FC<AttractionDetailPageProps> = ({
  spotId,
  spotName,
}) => {
  const guideRef = useRef<FloatingGuideRef>(null);

  // 点击"听讲解"按钮
  const handleListenGuide = () => {
    guideRef.current?.speak(
      `${spotName}高达88米，是世界上最高的青铜佛像之一，坐落于太湖之滨...`,
      'happy'
    );
  };

  // 点击"讲个故事"
  const handleStoryRequest = () => {
    guideRef.current?.speak(
      '传说在唐朝时期，这里曾是一片汪洋...',
      'surprised'
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F0' }}>
      {/* 页面内容 */}
      <div style={{ padding: '40px 24px' }}>
        <h1>{spotName}</h1>
        <p>景点详情...</p>

        {/* 讲解按钮 */}
        <button
          onClick={handleListenGuide}
          style={{
            padding: '12px 24px',
            backgroundColor: '#C84B31',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            marginRight: 12,
            cursor: 'pointer',
          }}
        >
          🔊 听数字人讲解
        </button>

        <button
          onClick={handleStoryRequest}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6A9C89',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          📖 讲个故事
        </button>
      </div>

      {/* 数字人浮窗 - 景点详情上下文 */}
      <FloatingGuide
        ref={guideRef}
        pageContext="attraction-detail"
        contextData={{ spotId, spotName }}
        autoWelcome={true}
        position="bottom-right"
      />
    </div>
  );
};

// ============================================================
// 示例 3：历史探索页使用
// ============================================================

export const HistoryExploreExample: React.FC = () => {
  const guideRef = useRef<FloatingGuideRef>(null);

  // 切换朝代时触发讲解
  const handleEraChange = (era: 'tang' | 'song' | 'ming' | 'modern') => {
    const eraTexts: Record<string, string> = {
      tang: '盛唐时期，灵山开始建寺，佛教文化逐渐兴盛...',
      song: '宋代，灵山佛教达到鼎盛，香火旺盛...',
      ming: '明代，灵山进行了大规模修缮...',
      modern: '1997年，灵山大佛落成开光，成为标志性景点...',
    };

    const eraEmotions: Record<string, 'surprised' | 'happy' | 'neutral'> = {
      tang: 'surprised',
      song: 'happy',
      ming: 'neutral',
      modern: 'happy',
    };

    guideRef.current?.speak(eraTexts[era], eraEmotions[era]);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F5F0' }}>
      {/* 页面内容 */}
      <div style={{ padding: '40px 24px' }}>
        <h1>时空穿越 · 历史探索</h1>

        {/* 朝代切换按钮 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {(['tang', 'song', 'ming', 'modern'] as const).map((era) => (
            <button
              key={era}
              onClick={() => handleEraChange(era)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6A9C89',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {era === 'tang' && '唐朝'}
              {era === 'song' && '宋朝'}
              {era === 'ming' && '明朝'}
              {era === 'modern' && '现代'}
            </button>
          ))}
        </div>
      </div>

      {/* 数字人浮窗 - 历史页上下文 */}
      <FloatingGuide
        ref={guideRef}
        pageContext="history"
        autoWelcome={true}
        position="bottom-right"
      />
    </div>
  );
};

// ============================================================
// 示例 4：使用 VRMManager API 直接控制
// ============================================================

export const DirectControlExample: React.FC = () => {
  // 可以直接使用 VRMManager 控制数字人
  // 不需要通过 ref，适用于任意位置的代码

  const handleDirectSpeak = () => {
    VRMManager.speak('这是通过 VRMManager 直接触发的说话', 'happy');
  };

  const handleSetEmotion = () => {
    VRMManager.setEmotion('surprised');
  };

  const handleExpandPanel = () => {
    VRMManager.expand();
  };

  return (
    <div style={{ padding: '40px 24px' }}>
      <h2>直接控制示例</h2>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={handleDirectSpeak}>直接说话</button>
        <button onClick={handleSetEmotion}>设置表情</button>
        <button onClick={handleExpandPanel}>展开面板</button>
      </div>

      {/* 数字人浮窗 */}
      <FloatingGuide pageContext="chat" autoWelcome={false} />
    </div>
  );
};

// ============================================================
// 导出所有示例
// ============================================================

export default {
  HomePageExample,
  AttractionDetailExample,
  HistoryExploreExample,
  DirectControlExample,
};
