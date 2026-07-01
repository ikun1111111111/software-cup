import React, { useState, useEffect, useRef } from 'react';
import { ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import TimelineView from '../../components/tourist/TimelineView';
import PuzzleGame from '../../components/tourist/PuzzleGame';
import StampWall from '../../components/tourist/StampWall';
import { FloatingGuide, FloatingGuideRef } from '../../components/vrm/FloatingGuide';
import { VRMManager } from '../../components/vrm/VRMManager';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';

const HistoryExplore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'puzzle' | 'stamps'>('timeline');
  const [activeEra, setActiveEra] = useState<string>('tang');
  const [loaded, setLoaded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sessionId = 'web-' + Date.now().toString(36);
  const guideRef = useRef<FloatingGuideRef>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // 切换朝代时触发数字人讲解
  const handleEraChange = (era: string) => {
    setActiveEra(era);

    const eraTexts: Record<string, { text: string; emotion: Emotion }> = {
      tang: { text: '盛唐时期，灵山开始建寺，佛教文化逐渐兴盛。玄奘法师曾在此驻足...', emotion: 'neutral' },
      唐代: { text: '盛唐时期，灵山开始建寺，佛教文化逐渐兴盛。玄奘法师曾在此驻足...', emotion: 'neutral' },
      song: { text: '宋代，灵山佛教达到鼎盛，香火旺盛，文人墨客纷纷前来朝拜...', emotion: 'neutral' },
      北宋: { text: '北宋时期，宋真宗赐额祥符禅寺，灵山香火渐盛，寺院名望远播...', emotion: 'neutral' },
      南宋: { text: '南宋时期，兵燹让祥符禅寺受损，也让灵山的传承留下沧桑痕迹...', emotion: 'neutral' },
      ming: { text: '明代，灵山进行了大规模修缮，留下了许多珍贵的历史遗迹...', emotion: 'neutral' },
      明代: { text: '明代，灵山进行了大规模修缮，留下了许多珍贵的历史遗迹...', emotion: 'neutral' },
      qing: { text: '清代，灵山经历了战火洗礼，但依然保留着深厚的佛教文化底蕴...', emotion: 'neutral' },
      清末: { text: '清末民初，寺院再遭战火，仅存古井、银杏与残垣，成为今天追溯历史的线索...', emotion: 'neutral' },
      modern: { text: '1997年，灵山大佛落成开光，高88米，成为世界上最高的青铜立佛...', emotion: 'surprise' },
      现代: { text: '现代灵山以大佛、梵宫与拈花湾连接古今，让佛教文化以新的方式被看见...', emotion: 'surprise' },
    };

    const eraData = eraTexts[era];
    if (eraData) {
      guideRef.current?.speak(eraData.text, eraData.emotion);
    }
  };

  // 监听 TimelineView 的朝代切换事件
  useEffect(() => {
    const handleTimelineEraChange = (e: CustomEvent) => {
      handleEraChange(e.detail.era);
    };

    window.addEventListener('timeline_era_change' as any, handleTimelineEraChange);
    return () => {
      window.removeEventListener('timeline_era_change' as any, handleTimelineEraChange);
    };
  }, []);

  const tabs = [
    { key: 'timeline' as const, label: '历史时间线', icon: <ClockCircleOutlined /> },
    { key: 'puzzle' as const, label: '文化解谜', icon: <BookOutlined /> },
    { key: 'stamps' as const, label: '印章收集', icon: <span>🔖</span> },
  ];

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '20px 16px' : '28px 28px' }}>

        {/* ═══ 标题区 — 时空穿越入口 ═══ */}
        <div style={{
          textAlign: 'center', marginBottom: isMobile ? 24 : 32, position: 'relative',
          overflow: 'hidden', padding: isMobile ? '28px 16px 20px' : '36px 24px 28px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(180,83,9,0.05) 0%, rgba(124,58,237,0.05) 50%, rgba(26,95,180,0.05) 100%)',
        }}>
          {/* 时光隧道涟漪 */}
          {[160, 220, 280].map((size, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: size, height: size,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: `1px solid rgba(106,156,137,${0.08 - i * 0.02})`,
              animation: `rippleExpand ${4 + i}s ease-in-out infinite ${i * 0.8}s`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* 顶部装饰线 */}
          <div style={{
            width: 140, height: 2,
            background: 'linear-gradient(90deg, transparent, #C8882E, transparent)',
            margin: '0 auto 20px',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'all 800ms ease 200ms',
          }} />

          {/* 朝代序列图标 */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 600ms ease 400ms',
          }}>
            {['🏛️', '📜', '🎋', '🐎', '⛩️', '🏮', '🏙️'].map((icon, i) => (
              <span
                key={i}
                style={{
                  fontSize: 18,
                  opacity: loaded ? 0.7 : 0,
                  transform: loaded ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.5)',
                  transition: `all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${500 + i * 100}ms`,
                  display: 'inline-block',
                }}
              >
                {icon}
              </span>
            ))}
          </div>

          <h1 style={{
            margin: '0 0 8px',
            fontSize: isMobile ? 24 : 30,
            fontWeight: 800,
            fontFamily: 'var(--font-calligraphy)',
            color: 'var(--text-primary)',
            letterSpacing: isMobile ? 3 : 6,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 800ms cubic-bezier(0.25, 1, 0.45, 0.94) 300ms',
          }}>
            时空穿越 · 历史探索
          </h1>

          <p style={{
            margin: 0, fontSize: 15, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-serif)', letterSpacing: 2,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 800ms ease 600ms',
          }}>
            穿越 1300 年灵山历史，从盛唐到现代
          </p>

          {/* 底部装饰线 */}
          <div style={{
            width: 140, height: 2,
            background: 'linear-gradient(90deg, transparent, #1A5FB4, transparent)',
            margin: '16px auto 0',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'all 800ms ease 500ms',
          }} />
        </div>

        {/* ═══ Tab 栏 — 东方风格增强 ═══ */}
        <div style={{
          display: 'flex',
          gap: isMobile ? 8 : 10,
          marginBottom: isMobile ? 20 : 28,
          justifyContent: isMobile ? 'flex-start' : 'center',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          padding: isMobile ? '0 0 8px' : 0,
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: isMobile ? '10px 20px' : '11px 26px',
                  borderRadius: 10,
                  flexShrink: isMobile ? 0 : undefined,
                  border: isActive ? 'none' : '1.5px solid var(--border-light)',
                  background: isActive
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, #4A8B73 100%)'
                    : 'rgba(255,255,255,0.7)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: 1,
                  boxShadow: isActive ? '0 2px 10px rgba(106,156,137,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: isActive ? '#fff' : 'var(--text-tertiary)', fontSize: 15 }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ 内容区域 ═══ */}
        <div className="animate-fade-in">
          {activeTab === 'timeline' && <TimelineView onEraChange={handleEraChange} />}
          {activeTab === 'puzzle' && (
            <PuzzleGame spotName="灵山大佛" sessionId={sessionId} />
          )}
          {activeTab === 'stamps' && <StampWall sessionId={sessionId} />}
        </div>
      </div>

      {/* 数字人浮窗 */}
      <FloatingGuide
        ref={guideRef}
        pageContext="history"
        autoWelcome={true}
        position="bottom-right"
      />
    </div>
  );
};

export default HistoryExplore;
