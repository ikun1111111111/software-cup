import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import type { Era } from './HistoryScene';
import type { DynastyData, Hotspot, DiscoveryCard, CardUnlockState } from '../../data/types';
import { getDynastyDataV2 } from '../../data/eraData';
import DiscoveryScene, { type DiscoveryState } from './DiscoveryScene';
import ExhibitArea from './ExhibitArea';
import InteractionBar from './InteractionBar';

export type { Era };

/* ================================================================
   向后兼容：原 ERA_DATA 常量（供 ChatPage choices 使用）
   ================================================================ */

interface EraStory {
  id: string;
  title: string;
  image: string;
  description: string;
}

interface EraDataCompat {
  welcomeText: string;
  accentColor: string;
  stories: EraStory[];
  questions: { text: string; icon: React.ReactNode }[];
}

// 保持兼容的 questions 数据（底部选择支仍然需要）
const ERA_DATA_COMPAT: Record<Era, EraDataCompat> = {
  tang: {
    welcomeText:
      '我们现在来到了盛唐。此处便是那时候的灵山胜境，佛光普照，梵音缭绕。你可随我一同游历这千年古刹。',
    accentColor: '#B87333',
    stories: [
      {
        id: 'tang-temple',
        title: '唐代山寺',
        image: '/image/history/art-tang-temple.png',
        description: '盛唐时期，灵山已有古寺矗立山崖，僧人晨钟暮鼓，香火不绝。',
      },
      {
        id: 'tang-buddha',
        title: '摩崖造像',
        image: '/image/history/art-tang-buddha.png',
        description: '唐代佛教鼎盛，灵山一带多有摩崖石刻佛像，庄严肃穆。',
      },
      {
        id: 'tang-poem',
        title: '诗人礼佛',
        image: '/image/history/art-tang-poem.png',
        description: '文人墨客常登灵山揽胜，留下诗篇无数，传颂至今。',
      },
    ],
    questions: [
      { text: '唐代灵山的佛教有多兴盛？', icon: <CloseOutlined /> },
      { text: '玄奘法师与灵山有什么渊源？', icon: <CloseOutlined /> },
      { text: '唐代建筑风格有什么特点？', icon: <CloseOutlined /> },
      { text: '诗人是如何描写灵山的？', icon: <CloseOutlined /> },
    ],
  },
  song: {
    welcomeText:
      '我们现在来到了北宋。烟雨朦胧中的灵山，别有一番江南禅意。且随我漫步这竹林石桥之间。',
    accentColor: '#6A9C89',
    stories: [
      {
        id: 'song-rain',
        title: '烟雨山寺',
        image: '/image/history/art-song-rain.png',
        description: '北宋时期，江南烟雨中的灵山更显空灵，山寺若隐若现。',
      },
      {
        id: 'song-garden',
        title: '禅意园林',
        image: '/image/history/art-song-garden.png',
        description: '宋代禅宗兴盛，灵山一带多有精舍园林，意境空寂。',
      },
      {
        id: 'song-bridge',
        title: '石桥香客',
        image: '/image/history/art-song-bridge.png',
        description: '香客络绎不绝，石桥上行人往来，一派祥和景象。',
      },
    ],
    questions: [
      { text: '宋代禅宗对灵山有什么影响？', icon: <CloseOutlined /> },
      { text: '宋代文人墨客如何游灵山？', icon: <CloseOutlined /> },
      { text: '宋代建筑与唐代有什么不同？', icon: <CloseOutlined /> },
      { text: '"烟雨江南"在灵山是如何体现的？', icon: <CloseOutlined /> },
    ],
  },
  ming: {
    welcomeText:
      '我们现在来到了大明。梵宫巍峨，红墙金瓦，此时的灵山已是江南佛教圣地。随我一览这盛世梵刹。',
    accentColor: '#C84B31',
    stories: [
      {
        id: 'ming-palace',
        title: '梵宫巍峨',
        image: '/image/history/art-ming-palace.png',
        description: '明代灵山寺院建筑群恢弘壮观，红墙金瓦，飞檐斗拱。',
      },
      {
        id: 'ming-ceremony',
        title: '盛世法会',
        image: '/image/history/art-ming-ceremony.png',
        description: '明代佛教法会盛大庄严，僧侣诵经，信众云集。',
      },
      {
        id: 'ming-bell',
        title: '洪武铜钟',
        image: '/image/history/art-ming-bell.png',
        description: '明代铸造的巨型铜钟，声震百里，至今犹存。',
      },
    ],
    questions: [
      { text: '明代梵宫是如何建造的？', icon: <CloseOutlined /> },
      { text: '明代灵山有哪些盛大法会？', icon: <CloseOutlined /> },
      { text: '明代佛教对民间有什么影响？', icon: <CloseOutlined /> },
      { text: '明代建筑有哪些独特之处？', icon: <CloseOutlined /> },
    ],
  },
};

/* ================================================================
   HistoryGuide v2：发现档案状态机
   ================================================================ */

interface HistoryGuideProps {
  era: Era;
  isVisible: boolean;
  onAskQuestion: (question: string) => void;
  onReturnModern: () => void;
  onCardSelect?: (cardId: string) => void;
  onSegmentSpeak?: (segmentText: string, emotion: string) => void | Promise<void>;
  onSkipSpeaking?: () => void;
  onHotspotClick?: () => void;
  onBackToOverview?: () => void;
  unlockedCards?: Set<string>;
  disabled?: boolean;
}

const STORAGE_KEY = (era: string) => `era-cards-${era}`;

const HistoryGuide: React.FC<HistoryGuideProps> = ({
  era,
  isVisible,
  onAskQuestion,
  onReturnModern,
  onCardSelect,
  onSegmentSpeak,
  onSkipSpeaking,
  onHotspotClick,
  onBackToOverview,
  unlockedCards: externalUnlocked,
  disabled = false,
}) => {
  const dynastyData = getDynastyDataV2(era);
  const cards = dynastyData?.cards ?? [];
  const accentColor = ERA_DATA_COMPAT[era].accentColor;

  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>('overview');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [cardStates, setCardStates] = useState<CardUnlockState[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY(era));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return cards.map((c) => ({ id: c.id, unlocked: false, viewed: false }));
  });
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  // 同步外部解锁状态
  useEffect(() => {
    if (!externalUnlocked) return;
    setCardStates((prev) =>
      prev.map((s) =>
        externalUnlocked.has(s.id) ? { ...s, unlocked: true } : s
      )
    );
  }, [externalUnlocked]);

  // 持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(era), JSON.stringify(cardStates));
  }, [cardStates, era]);

  // 重置（朝代切换时）
  useEffect(() => {
    if (!isVisible) {
      setDiscoveryState('overview');
      setSelectedCardId(null);
      setCurrentSegmentIndex(0);
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
        segmentTimerRef.current = null;
      }
      isSpeakingRef.current = false;
      return;
    }
    setCardStates(() => {
      const saved = localStorage.getItem(STORAGE_KEY(era));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length === cards.length) return parsed;
        } catch { /* ignore */ }
      }
      return cards.map((c) => ({ id: c.id, unlocked: false, viewed: false }));
    });
    setDiscoveryState('overview');
    setSelectedCardId(null);
  }, [isVisible, era, cards]);

  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    setSelectedCardId(hotspot.cardId);
    setDiscoveryState('zooming');
    setCurrentSegmentIndex(0);

    // 解锁卡片
    setCardStates((prev) =>
      prev.map((s) =>
        s.id === hotspot.cardId ? { ...s, unlocked: true, viewed: true } : s
      )
    );
    onHotspotClick?.();

    // 播放解锁音效
    const unlockAudio = new Audio(`/audio/sfx-${era}-unlock.mp3`);
    unlockAudio.volume = 0.6;
    unlockAudio.play().catch(() => { /* ignore */ });

    // zooming 动画结束后进入 card 态
    setTimeout(() => {
      setDiscoveryState('card');
    }, 1000);
  }, [era, onCardSelect]);

  const handleStartSpeaking = useCallback(() => {
    if (!selectedCard || !selectedCard.segments || selectedCard.segments.length === 0) {
      //  fallback to old talkingPoints
      if (selectedCard?.talkingPoints) {
        const prompt = `请根据以下要点，以导游小景的身份为游客讲解「${selectedCard.title}」：\n${selectedCard.talkingPoints.join('\n')}`;
        onAskQuestion(selectedCard.title);
      }
      return;
    }

    setDiscoveryState('speaking');
    setCurrentSegmentIndex(0);
    isSpeakingRef.current = true;

    const segments = selectedCard.segments;
    let index = 0;

    const playNext = async () => {
      if (!isSpeakingRef.current) return;
      if (index >= segments.length) {
        setDiscoveryState('interact');
        isSpeakingRef.current = false;
        return;
      }

      const seg = segments[index];
      setCurrentSegmentIndex(index);
      await onSegmentSpeak?.(seg.text, seg.emotion);

      if (!isSpeakingRef.current) return;

      index++;
      segmentTimerRef.current = setTimeout(playNext, 800);
    };

    playNext();
  }, [selectedCard, onSegmentSpeak, onAskQuestion]);

  const handleSkipSpeaking = useCallback(() => {
    isSpeakingRef.current = false;
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    setDiscoveryState('interact');
    onSkipSpeaking?.();
  }, [onSkipSpeaking]);

  const handleBackToOverview = useCallback(() => {
    setDiscoveryState('overview');
    setSelectedCardId(null);
    setCurrentSegmentIndex(0);
    onBackToOverview?.();
  }, [onBackToOverview]);

  const handleAsk = useCallback((text: string) => {
    onAskQuestion(text);
  }, [onAskQuestion]);

  // 当前段数据
  const currentSegment = selectedCard?.segments?.[currentSegmentIndex];
  const isLastSegment = selectedCard?.segments
    ? currentSegmentIndex >= selectedCard.segments.length - 1
    : true;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: discoveryState === 'overview' ? 'auto' : 'none',
      }}
    >
      {/* 双层背景 + 热点层（zIndex 1，在角色下方） */}
      <DiscoveryScene
        era={era}
        state={discoveryState}
        selectedCardId={selectedCardId}
        unlockedCards={new Set(cardStates.filter((s) => s.unlocked).map((s) => s.id))}
        onHotspotClick={handleHotspotClick}
      />

      {/* 右侧大卡面板（card / speaking / interact 态显示） */}
      {(discoveryState === 'card' || discoveryState === 'speaking' || discoveryState === 'interact') && selectedCard && (
        <div
          style={{
            position: 'absolute',
            top: '16%',
            right: '3%',
            width: 'min(380px, 32vw)',
            zIndex: 6,
            pointerEvents: 'auto',
            animation: 'cardSlideIn 500ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* 卷轴上轴装饰 */}
          <div
            style={{
              height: 20,
              backgroundImage: "url('/image/scroll/scroll-top.png')",
              backgroundSize: '100% 100%',
              opacity: 0.8,
            }}
          />

          {/* 内容区 */}
          <div
            style={{
              background: 'rgba(253, 251, 247, 0.94)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderLeft: '1px solid rgba(180, 160, 130, 0.3)',
              borderRight: '1px solid rgba(180, 160, 130, 0.3)',
              padding: '18px 16px',
              position: 'relative',
            }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleBackToOverview}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#8A8278',
                fontSize: 14,
                padding: 4,
                zIndex: 2,
              }}
            >
              <CloseOutlined />
            </button>

            {/* 动态展品 */}
            {currentSegment && (
              <ExhibitArea
                exhibit={currentSegment.exhibit}
                segmentText={currentSegment.text}
              />
            )}

            {/* 标题 */}
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#2A2520',
                marginBottom: 8,
                fontFamily: "'KaiTi','STKaiti','serif'",
                paddingRight: 24,
              }}
            >
              {selectedCard.title}
            </h3>

            {/* 简介 */}
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: '#5C554C',
                marginBottom: 16,
              }}
            >
              {selectedCard.summary}
            </p>

            {/* 互动问题（speaking / interact 态显示） */}
            {(discoveryState === 'speaking' || discoveryState === 'interact') && selectedCard.interactiveQuestion && (
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(248, 246, 242, 0.8)',
                  borderRadius: 8,
                  borderLeft: `3px solid ${accentColor}`,
                  marginBottom: 14,
                  animation: 'fadeIn 400ms ease',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: '#6A6358',
                    fontStyle: 'italic',
                  }}
                >
                  💬 {selectedCard.interactiveQuestion}
                </p>
              </div>
            )}

            {/* 听小景讲解按钮（card 态显示） */}
            {discoveryState === 'card' && (
              <button
                onClick={handleStartSpeaking}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${accentColor}40`,
                  transition: 'all 200ms ease',
                }}
              >
                听小景讲解
              </button>
            )}
          </div>

          {/* 卷轴下轴装饰 */}
          <div
            style={{
              height: 20,
              backgroundImage: "url('/image/scroll/scroll-bottom.png')",
              backgroundSize: '100% 100%',
              opacity: 0.8,
            }}
          />
        </div>
      )}

      {/* 讲解中跳过按钮 */}
      {discoveryState === 'speaking' && (
        <button
          onClick={handleSkipSpeaking}
          style={{
            position: 'absolute',
            bottom: '4%',
            right: '4%',
            zIndex: 6,
            padding: '8px 16px',
            background: 'rgba(20, 18, 16, 0.45)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20,
            color: '#F5F0E8',
            fontSize: 12,
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'all 200ms ease',
          }}
        >
          跳过讲解
        </button>
      )}

      {/* 互动态底部按钮 */}
      {discoveryState === 'interact' && (
        <InteractionBar
          accentColor={accentColor}
          onContinue={handleBackToOverview}
          onAsk={handleAsk}
          disabled={disabled}
        />
      )}

      {/* 返回现代按钮（overview 态右上角） */}
      {discoveryState === 'overview' && (
        <button
          onClick={onReturnModern}
          style={{
            position: 'absolute',
            top: '3%',
            right: '3%',
            zIndex: 6,
            padding: '8px 16px',
            background: 'rgba(20, 18, 16, 0.35)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20,
            color: '#F5F0E8',
            fontSize: 13,
            fontFamily: "'KaiTi','STKaiti',serif",
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'all 200ms ease',
          }}
        >
          返回现代
        </button>
      )}

      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export { ERA_DATA_COMPAT as ERA_DATA };
export default HistoryGuide;
