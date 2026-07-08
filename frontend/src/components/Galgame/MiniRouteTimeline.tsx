import React, { memo } from 'react';
import type { RouteData } from './routeData';

interface MiniRouteTimelineProps {
  route: RouteData;
  currentSpotIndex: number;
  onSpotClick?: (index: number) => void;
  onClose?: () => void;
}

const MiniRouteTimeline: React.FC<MiniRouteTimelineProps> = memo(({
  route,
  currentSpotIndex,
  onSpotClick,
  onClose,
}) => {
  return (
    <div
      style={{
        width: 320,
        maxHeight: 'calc(100vh - 320px)',
        background: 'linear-gradient(180deg, rgba(253,251,247,0.96) 0%, rgba(245,240,232,0.94) 100%)',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(42,37,32,0.18), 0 2px 6px rgba(42,37,32,0.08)',
        border: '1px solid rgba(180,160,130,0.35)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Noto Serif SC', serif",
      }}
    >
      {/* 顶部轴头装饰 */}
      <div
        style={{
          height: 14,
          backgroundImage: "url('/image/scroll/scroll-top.png')",
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          flexShrink: 0,
        }}
      />

      {/* 标题条 */}
      <div
        style={{
          padding: '12px 16px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(180,160,130,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#2A2520', letterSpacing: '0.5px' }}>
            {route.name}
          </span>
          <span style={{ fontSize: 11, color: '#8A857C' }}>
            {currentSpotIndex + 1} / {route.spots.length}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid rgba(42,37,32,0.15)',
              background: 'transparent',
              color: '#5A554E',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="关闭"
          >
            ×
          </button>
        )}
      </div>

      {/* 时间线 */}
      <div
        style={{
          padding: '14px 18px 18px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {route.spots.map((spot, idx) => {
          const isVisited = idx <= currentSpotIndex;
          const isCurrent = idx === currentSpotIndex;
          const isLast = idx === route.spots.length - 1;
          return (
            <div
              key={spot.id}
              onClick={() => onSpotClick?.(idx)}
              style={{
                display: 'flex',
                gap: 12,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* 点 + 连线 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  width: 14,
                }}
              >
                <div
                  style={{
                    width: isCurrent ? 14 : 10,
                    height: isCurrent ? 14 : 10,
                    borderRadius: '50%',
                    background: isCurrent
                      ? '#C84B31'
                      : isVisited
                      ? '#2A2520'
                      : 'transparent',
                    border: `2px solid ${isCurrent ? '#C84B31' : isVisited ? '#2A2520' : '#9A958C'}`,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(200,75,49,0.18)' : 'none',
                    transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
                    marginTop: 4,
                    transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 28,
                      background: idx < currentSpotIndex ? '#2A2520' : 'rgba(154,149,140,0.4)',
                      marginTop: 4,
                      marginBottom: 4,
                    transition: 'background 180ms ease',
                  }}
                />
                )}
              </div>

              {/* 文本 */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14, paddingTop: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#C84B31' : isVisited ? '#2A2520' : '#9A958C',
                    lineHeight: 1.3,
                    transition: 'color 180ms ease',
                  }}
                >
                  {spot.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#8A857C',
                    marginTop: 2,
                  }}
                >
                  {spot.duration}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部轴头装饰 */}
      <div
        style={{
          height: 14,
          backgroundImage: "url('/image/scroll/scroll-bottom.png')",
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          flexShrink: 0,
        }}
      />
    </div>
  );
});

MiniRouteTimeline.displayName = 'MiniRouteTimeline';

export default MiniRouteTimeline;
