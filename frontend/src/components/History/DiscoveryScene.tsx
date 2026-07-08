import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Era } from './HistoryScene';
import type { DynastyData, Hotspot } from '../../data/types';
import { getDynastyDataV2 } from '../../data/eraData';

export type DiscoveryState = 'overview' | 'zooming' | 'card' | 'speaking' | 'interact';

interface DiscoverySceneProps {
  era: Era;
  state: DiscoveryState;
  selectedCardId: string | null;
  unlockedCards: Set<string>;
  onHotspotClick: (hotspot: Hotspot) => void;
}

const ERA_OVERVIEW_BG: Record<Era, string> = {
  tang: '/image/history/bg-tang-overview.png',
  song: '/image/history/bg-song-overview.jpg',
  ming: '/image/history/bg-ming-overview.jpg',
};

const usePreloadImages = (urls: string[]) => {
  useEffect(() => {
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [urls]);
};

const getCardBackground = (
  era: Era,
  cardId: string,
  mainImage: string | null | undefined
): string => {
  if (mainImage) {
    return `/image/history/${mainImage}`;
  }
  const suffix = cardId.replace(`${era}-`, '');
  return `/image/history/bg-${era}-${suffix}.jpg`;
};

const DiscoveryScene: React.FC<DiscoverySceneProps> = ({
  era,
  state,
  selectedCardId,
  unlockedCards,
  onHotspotClick,
}) => {
  const dynastyData = getDynastyDataV2(era);
  const hotspots = dynastyData?.hotspots ?? [];

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return dynastyData?.cards.find((c) => c.id === selectedCardId) ?? null;
  }, [dynastyData, selectedCardId]);

  const selectedHotspot = useMemo(() => {
    if (!selectedCardId) return null;
    return hotspots.find((h) => h.cardId === selectedCardId) ?? null;
  }, [hotspots, selectedCardId]);

  // 进入时确保 Layer B 先以初始样式渲染，再触发过渡动画（修复 CSS transition 在元素首次挂载时不生效的问题）
  const [enteringCardId, setEnteringCardId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const enterRafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (enterRafRef.current) {
      cancelAnimationFrame(enterRafRef.current);
      enterRafRef.current = null;
    }
    if (selectedCardId) {
      setEnteringCardId(selectedCardId);
      setEntered(false);
      enterRafRef.current = requestAnimationFrame(() => {
        setEntered(true);
        enterRafRef.current = null;
      });
    } else {
      setEnteringCardId(null);
      setEntered(false);
    }
    return () => {
      if (enterRafRef.current) {
        cancelAnimationFrame(enterRafRef.current);
      }
    };
  }, [selectedCardId]);

  // 退出时延迟卸载 Layer B，保证淡出动画完整播放
  const [exitingCardId, setExitingCardId] = useState<string | null>(null);
  const exitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedCardId) {
      setExitingCardId(null);
      if (exitingTimerRef.current) {
        clearTimeout(exitingTimerRef.current);
        exitingTimerRef.current = null;
      }
      return;
    }

    if (exitingCardId) {
      if (exitingTimerRef.current) {
        clearTimeout(exitingTimerRef.current);
      }
      exitingTimerRef.current = setTimeout(() => {
        setExitingCardId(null);
        exitingTimerRef.current = null;
      }, 900);
    }

    return () => {
      if (exitingTimerRef.current) {
        clearTimeout(exitingTimerRef.current);
      }
    };
  }, [selectedCardId, exitingCardId]);

  // 当 selectedCardId 从非空变为 null 时，把上一个 cardId 保存到 exitingCardId
  const prevSelectedCardIdRef = useRef<string | null>(selectedCardId);
  useEffect(() => {
    const prev = prevSelectedCardIdRef.current;
    prevSelectedCardIdRef.current = selectedCardId;
    if (prev && !selectedCardId) {
      setExitingCardId(prev);
    }
  }, [selectedCardId]);

  const activeCardId = selectedCardId ?? enteringCardId ?? exitingCardId;
  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    return dynastyData?.cards.find((c) => c.id === activeCardId) ?? null;
  }, [dynastyData, activeCardId]);

  const preloadUrls = useMemo(() => {
    const overview = ERA_OVERVIEW_BG[era];
    const cardImages = dynastyData?.cards.map((c) => `/image/history/${c.mainImage}`) ?? [];
    return [overview, ...cardImages];
  }, [dynastyData, era]);

  usePreloadImages(preloadUrls);

  const isZoomingOrBeyond = state === 'zooming' || state === 'card' || state === 'speaking' || state === 'interact';
  const hotspotOrigin = selectedHotspot
    ? `${selectedHotspot.position.left} ${selectedHotspot.position.top}`
    : '50% 50%';

  // 转场时间线：镜头推进感，保持清晰但不过于拖沓
  const transitionDuration = 900;
  const layerAOpacityMs = 700;
  const layerBOpacityMs = 750;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: state === 'overview' ? 'auto' : 'none',
      }}
    >
      {/* Layer A: 全景图（overview 态显示，zooming 时推远放大淡出） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${ERA_OVERVIEW_BG[era]}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transformOrigin: hotspotOrigin,
          transform: isZoomingOrBeyond ? 'scale(3.0)' : 'scale(1)',
          opacity: isZoomingOrBeyond ? 0 : 1,
          transition: `transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${layerAOpacityMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          willChange: 'transform, opacity',
        }}
      />

      {/* Layer B: 专属图（zooming 时从模糊/放大状态迎面淡入定格） */}
      {activeCardId && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${getCardBackground(era, activeCardId, activeCard?.mainImage)}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isZoomingOrBeyond && entered ? 1 : 0,
            transform: isZoomingOrBeyond && entered ? 'scale(1)' : 'scale(1.4)',
            filter: isZoomingOrBeyond && entered ? 'blur(0px)' : 'blur(10px)',
            transition: `opacity ${layerBOpacityMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: 'transform, opacity, filter',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 过渡曝光/暗角叠加：转场时微收暗但不去黑边，强化镜头切换感 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isZoomingOrBeyond
            ? 'radial-gradient(ellipse at center, transparent 55%, rgba(20,18,16,0.22) 100%)'
            : 'radial-gradient(ellipse at center, transparent 70%, rgba(20,18,16,0.12) 100%)',
          opacity: isZoomingOrBeyond ? 1 : 0,
          transition: `opacity ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          pointerEvents: 'none',
        }}
      />

      {/* 热点层（仅 overview 态可见） */}
      {state === 'overview' && hotspots.map((hot) => {
        const unlocked = unlockedCards.has(hot.cardId);
        return (
          <button
            key={hot.id}
            className="discovery-hotspot"
            onClick={() => onHotspotClick(hot)}
            style={{
              position: 'absolute',
              left: hot.position.left,
              top: hot.position.top,
              transform: 'translate(-50%, -50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 20,
              zIndex: 50,
            }}
          >
            {/* 呼吸光点 */}
            <span
              className="hotspot-pulse"
              style={{
                display: 'block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: hot.color,
                boxShadow: `0 0 12px ${hot.color}60, 0 0 24px ${hot.color}30`,
                animation: 'hotspotBreathe 2.4s ease-in-out infinite',
                willChange: 'transform, opacity',
              }}
            />
            {/* 涟漪环 */}
            <span
              className="hotspot-ripple"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `1.5px solid ${hot.color}`,
                opacity: 0,
                animation: 'hotspotRipple 2.4s ease-out infinite',
              }}
            />
            {/* 标签（hover 时显示） */}
            <span
              className="hotspot-label"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                fontFamily: "'KaiTi','STKaiti',serif",
                fontSize: 14,
                color: '#F5F0E8',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                opacity: 0,
                transition: 'opacity 300ms ease',
                pointerEvents: 'none',
                writingMode: 'vertical-rl',
                letterSpacing: 4,
                padding: '8px 4px',
                background: 'rgba(20,18,16,0.4)',
                borderRadius: 6,
                backdropFilter: 'blur(4px)',
              }}
            >
              {hot.name}
              {unlocked && <span style={{ color: hot.color, marginTop: 4, display: 'block' }}>●</span>}
            </span>

            <style>{`
              @keyframes hotspotBreathe {
                0%, 100% { opacity: 0.35; transform: scale(1); }
                50% { opacity: 0.85; transform: scale(1.4); }
              }
              @keyframes hotspotRipple {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
              }
            `}</style>
          </button>
        );
      })}
    </div>
  );
};

export default DiscoveryScene;

