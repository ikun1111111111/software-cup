import React, { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { RouteData, RouteSpot } from './routeData';

interface GalgameRouteScrollProps {
  route: RouteData | null;
  currentSpotIndex: number;
  isVisible: boolean;
  onSpotClick?: (index: number) => void;
}

function buildRoutePath(spots: RouteSpot[]): string {
  if (spots.length === 0) return '';

  let path = `M ${spots[0].x} ${spots[0].y}`;
  for (let index = 1; index < spots.length; index += 1) {
    const previous = spots[index - 1];
    const current = spots[index];
    const controlX = (previous.x + current.x) / 2 + (index % 2 === 0 ? 1.5 : -1.5);
    const controlY = (previous.y + current.y) / 2;
    path += ` Q ${controlX} ${controlY}, ${current.x} ${current.y}`;
  }
  return path;
}

function buildSegmentPath(from: RouteSpot, to: RouteSpot, segmentIndex: number): string {
  const controlX = (from.x + to.x) / 2 + (segmentIndex % 2 === 0 ? -1.5 : 1.5);
  const controlY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY}, ${to.x} ${to.y}`;
}

const GalgameRouteScroll: React.FC<GalgameRouteScrollProps> = memo(({
  route,
  currentSpotIndex,
  isVisible,
  onSpotClick,
}) => {
  const [showContent, setShowContent] = useState(false);
  const rawId = useId();
  const brushPatternId = useMemo(
    () => `routeBrush-${rawId.replace(/:/g, '')}-${route?.id || 'empty'}`,
    [rawId, route?.id]
  );
  const routePath = useMemo(() => buildRoutePath(route?.spots || []), [route?.spots]);

  useEffect(() => {
    if (!isVisible) {
      setShowContent(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setShowContent(true), 120);
    return () => window.clearTimeout(timer);
  }, [isVisible]);

  if (!route) return null;

  return (
    <div
      className={`route-scroll-container ${isVisible ? 'expanded' : ''} ${showContent ? 'content-visible' : ''}`}
      data-testid="galgame-route-scroll"
      data-route={route.name}
      data-current={currentSpotIndex}
      style={{
        position: 'absolute',
        top: '10%',
        bottom: '16%',
        right: '4%',
        left: '22%',
        zIndex: 5,
        display: 'flex',
        alignItems: 'stretch',
        transformOrigin: 'right center',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="route-scroll-roller route-scroll-roller--left" />

      <div className="route-scroll-canvas">
        <img
          className="route-scroll-map"
          src="/image/map-bg.png"
          alt="景区导览"
          draggable={false}
          decoding="async"
        />

        <img
          className="route-scroll-texture"
          src="/image/map-bg-texture.jpg"
          alt=""
          draggable={false}
          decoding="async"
        />

        <div className="route-scroll-rod route-scroll-rod--top" />
        <div className="route-scroll-rod route-scroll-rod--bottom" />

        <svg className="route-scroll-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <InkRoutePath
            spots={route.spots}
            routePath={routePath}
            currentSpotIndex={currentSpotIndex}
            brushPatternId={brushPatternId}
            brushImage={route.brushImage}
          />

          {route.spots.length > 0 && (
            <InkSeal x={route.spots[0].x} y={route.spots[0].y} type="start" visible={showContent} />
          )}

          {route.spots.length > 1 && currentSpotIndex >= route.spots.length - 1 && (
            <InkSeal
              x={route.spots[route.spots.length - 1].x}
              y={route.spots[route.spots.length - 1].y}
              type="end"
              visible={showContent}
            />
          )}
        </svg>

        <div className="route-scroll-markers" aria-label={`${route.name}路线节点`}>
          {route.spots.map((spot, index) => {
            const isVisited = index <= currentSpotIndex;
            const isCurrent = index === currentSpotIndex;
            return (
              <SpotMarker
                key={spot.id}
                spot={spot}
                index={index}
                routeColor={route.color}
                isVisited={isVisited}
                isCurrent={isCurrent}
                onSpotClick={onSpotClick}
              />
            );
          })}
        </div>
      </div>

      <div className="route-scroll-roller route-scroll-roller--right" />
      <style>{routeScrollStyles}</style>
    </div>
  );
});

GalgameRouteScroll.displayName = 'GalgameRouteScroll';

const InkRoutePath: React.FC<{
  spots: RouteSpot[];
  routePath: string;
  currentSpotIndex: number;
  brushPatternId: string;
  brushImage: string;
}> = memo(({ spots, routePath, currentSpotIndex, brushPatternId, brushImage }) => {
  if (spots.length < 2) return null;

  return (
    <>
      <defs>
        <pattern id={brushPatternId} patternUnits="userSpaceOnUse" width="0.8" height="8">
          <image href={brushImage} width="0.8" height="8" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>
      <path
        d={routePath}
        fill="none"
        stroke={`url(#${brushPatternId})`}
        strokeWidth="0.5"
        strokeOpacity="0.12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {spots.slice(0, -1).map((from, index) => {
        const to = spots[index + 1];
        const isDrawn = index < currentSpotIndex;
        const isDrawing = index === currentSpotIndex;
        return (
          <InkSegment
            key={`${from.id}-${to.id}`}
            path={buildSegmentPath(from, to, index)}
            brushPatternId={brushPatternId}
            isVisible={isDrawn || isDrawing}
            shouldAnimate={isDrawing}
          />
        );
      })}
    </>
  );
});

InkRoutePath.displayName = 'InkRoutePath';

const InkSegment: React.FC<{
  path: string;
  brushPatternId: string;
  isVisible: boolean;
  shouldAnimate: boolean;
}> = memo(({ path, brushPatternId, isVisible, shouldAnimate }) => (
  <path
    className={`route-ink-segment ${isVisible ? 'is-visible' : ''} ${shouldAnimate ? 'is-drawing' : ''}`}
    d={path}
    fill="none"
    stroke={`url(#${brushPatternId})`}
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    pathLength={1}
  />
));

InkSegment.displayName = 'InkSegment';

const InkSeal: React.FC<{
  x: number;
  y: number;
  type: 'start' | 'end';
  visible: boolean;
}> = memo(({ x, y, type, visible }) => {
  const size = 6.5;
  return (
    <g
      className={`route-ink-seal ${visible ? 'is-visible' : ''}`}
      style={{ transformOrigin: `${x}% ${y}%` }}
    >
      <image
        href={type === 'start' ? '/image/seals/seal-start.png' : '/image/seals/seal-end.png'}
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
});

InkSeal.displayName = 'InkSeal';

const SpotMarker: React.FC<{
  spot: RouteSpot;
  index: number;
  routeColor: string;
  isVisited: boolean;
  isCurrent: boolean;
  onSpotClick?: (index: number) => void;
}> = memo(({ spot, index, routeColor, isVisited, isCurrent, onSpotClick }) => {
  const handleClick = useCallback(() => {
    onSpotClick?.(index);
  }, [index, onSpotClick]);

  return (
    <button
      type="button"
      className={`route-spot-marker ${isVisited ? 'is-visited' : ''} ${isCurrent ? 'is-current' : ''}`}
      data-testid={`route-spot-marker-${spot.id}`}
      onClick={handleClick}
      aria-label={`讲解第${index + 1}站：${spot.name}`}
      aria-pressed={isCurrent}
      style={{
        '--spot-x': `${spot.x}%`,
        '--spot-y': `${spot.y}%`,
        '--spot-scale': isCurrent ? 1.22 : 1,
        '--spot-hover-scale': isCurrent ? 1.28 : 1.12,
        '--route-color': routeColor,
      } as React.CSSProperties}
    >
      <span className="spot-marker__halo" />
      <span className="spot-marker__pin">
        <span className="spot-marker__index">{index + 1}</span>
        <img className="spot-marker__icon" src={spot.icon} alt="" draggable={false} decoding="async" />
      </span>
      <span className="spot-marker__label">
        <span>{spot.name}</span>
        {isCurrent && <em>正在讲</em>}
      </span>
      <span className="spot-marker__tap-ripple" />
    </button>
  );
});

SpotMarker.displayName = 'SpotMarker';

const routeScrollStyles = `
  .route-scroll-container {
    opacity: 0;
    transform: translate3d(16px, 0, 0) scaleX(0.985);
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
    contain: layout paint style;
    will-change: transform, opacity;
  }

  .route-scroll-container.expanded {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleX(1);
  }

  .route-scroll-roller {
    width: 50px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transform: translate3d(0, 0, 0);
    transition: opacity 220ms ease 80ms;
  }

  .route-scroll-container.content-visible .route-scroll-roller {
    opacity: 1;
  }

  .route-scroll-roller--left {
    background-image: url('/image/scroll/scroll-left.png');
  }

  .route-scroll-roller--right {
    background-image: url('/image/scroll/scroll-right.png');
  }

  .route-scroll-canvas {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #f5f0e8;
    border-top: 1px solid rgba(180,160,130,0.25);
    border-bottom: 1px solid rgba(180,160,130,0.25);
    transform: translateZ(0);
    contain: layout paint style;
    isolation: isolate;
  }

  .route-scroll-map,
  .route-scroll-texture {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    pointer-events: none;
    user-select: none;
    opacity: 0;
    transition: opacity 280ms ease 90ms;
  }

  .route-scroll-container.content-visible .route-scroll-map {
    opacity: 1;
  }

  .route-scroll-texture {
    mix-blend-mode: normal;
  }

  .route-scroll-container.content-visible .route-scroll-texture {
    opacity: 0.1;
  }

  .route-scroll-rod {
    position: absolute;
    left: 0;
    right: 0;
    height: 24px;
    z-index: 2;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0;
    transition: opacity 220ms ease 120ms;
    pointer-events: none;
  }

  .route-scroll-container.content-visible .route-scroll-rod {
    opacity: 1;
  }

  .route-scroll-rod--top {
    top: 0;
    background-image: url('/image/scroll/scroll-top.png');
  }

  .route-scroll-rod--bottom {
    bottom: 0;
    background-image: url('/image/scroll/scroll-bottom.png');
  }

  .route-scroll-svg,
  .route-scroll-markers {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 260ms ease 140ms;
  }

  .route-scroll-svg {
    pointer-events: none;
  }

  .route-scroll-container.content-visible .route-scroll-svg,
  .route-scroll-container.content-visible .route-scroll-markers {
    opacity: 1;
  }

  .route-ink-segment {
    opacity: 0;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: opacity 160ms ease, stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .route-ink-segment.is-visible {
    opacity: 0.8;
    stroke-dashoffset: 0;
  }

  .route-ink-segment.is-drawing {
    animation: routeInkDraw 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .route-ink-seal {
    opacity: 0;
    transform: scale(0.8);
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
  }

  .route-ink-seal.is-visible {
    opacity: 1;
    transform: scale(1);
  }

  .route-spot-marker {
    position: absolute;
    left: var(--spot-x);
    top: var(--spot-y);
    z-index: 2;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    transform: translate3d(-50%, -50%, 0) scale(var(--spot-scale));
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
  }

  .route-spot-marker.is-current {
    z-index: 12;
  }

  .route-spot-marker:hover,
  .route-spot-marker:focus-visible {
    transform: translate3d(-50%, -50%, 0) scale(var(--spot-hover-scale));
    outline: none;
  }

  .route-spot-marker:active {
    transform: translate3d(-50%, -50%, 0) scale(0.98);
  }

  .spot-marker__pin {
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background:
      radial-gradient(circle at 45% 36%, rgba(255,253,248,0.96), rgba(250,237,211,0.72) 52%, rgba(126,91,47,0.26)),
      linear-gradient(135deg, rgba(255,255,255,0.82), rgba(218,190,138,0.36));
    border: 1px solid rgba(116,83,42,0.18);
    box-shadow: 0 6px 14px rgba(64,45,24,0.12);
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .route-spot-marker.is-current .spot-marker__pin,
  .route-spot-marker:hover .spot-marker__pin,
  .route-spot-marker:focus-visible .spot-marker__pin {
    border-color: color-mix(in srgb, var(--route-color) 48%, rgba(116,83,42,0.18));
    box-shadow: 0 8px 18px color-mix(in srgb, var(--route-color) 22%, rgba(64,45,24,0.12));
  }

  .spot-marker__index {
    position: absolute;
    right: -7px;
    top: -7px;
    min-width: 17px;
    height: 17px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--route-color);
    color: #fffaf0;
    border: 1px solid rgba(255,250,238,0.82);
    font-size: 10px;
    font-weight: 900;
    line-height: 1;
    box-shadow: 0 4px 9px color-mix(in srgb, var(--route-color) 24%, transparent);
  }

  .spot-marker__icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    opacity: 0.58;
    transform: translateZ(0);
    transition: opacity 160ms ease, transform 160ms ease;
    pointer-events: none;
  }

  .route-spot-marker.is-visited .spot-marker__icon {
    opacity: 0.9;
  }

  .route-spot-marker.is-current .spot-marker__icon {
    opacity: 1;
    transform: translateZ(0) scale(1.08);
  }

  .spot-marker__label {
    position: absolute;
    top: -31px;
    left: 50%;
    transform: translate3d(-50%, 0, 0);
    white-space: nowrap;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(42,37,32,0.08);
    background: rgba(253,251,247,0.9);
    color: rgba(42,37,32,0.56);
    box-shadow: 0 3px 10px rgba(42,37,32,0.07);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
    pointer-events: none;
    transition: color 160ms ease, border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }

  .spot-marker__label span,
  .spot-marker__label em {
    display: inline-block;
    vertical-align: middle;
  }

  .spot-marker__label em {
    margin-left: 6px;
    color: color-mix(in srgb, var(--route-color) 76%, #6b4c25);
    font-style: normal;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  .route-spot-marker.is-visited .spot-marker__label {
    color: rgba(42,37,32,0.76);
  }

  .route-spot-marker.is-current .spot-marker__label,
  .route-spot-marker:hover .spot-marker__label,
  .route-spot-marker:focus-visible .spot-marker__label {
    color: var(--route-color);
    border-color: color-mix(in srgb, var(--route-color) 32%, rgba(42,37,32,0.08));
    background: rgba(255,253,248,0.96);
    transform: translate3d(-50%, -2px, 0);
  }

  .spot-marker__halo,
  .spot-marker__tap-ripple {
    position: absolute;
    inset: -7px;
    border-radius: 999px;
    pointer-events: none;
  }

  .spot-marker__halo {
    opacity: 0;
    background: radial-gradient(circle, color-mix(in srgb, var(--route-color) 22%, transparent), transparent 70%);
    transition: opacity 160ms ease;
  }

  .route-spot-marker:hover .spot-marker__halo,
  .route-spot-marker:focus-visible .spot-marker__halo {
    opacity: 1;
  }

  .route-spot-marker.is-current .spot-marker__halo {
    opacity: 1;
    animation: routeSpotBreathe 1.8s ease-in-out infinite;
  }

  .spot-marker__tap-ripple {
    opacity: 0;
    border: 1px solid color-mix(in srgb, var(--route-color) 56%, white);
    transform: scale(0.6);
  }

  .route-spot-marker:active .spot-marker__tap-ripple,
  .route-spot-marker.is-current .spot-marker__tap-ripple {
    animation: routeSpotTap 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes routeInkDraw {
    from { stroke-dashoffset: 1; opacity: 0; }
    to { stroke-dashoffset: 0; opacity: 0.8; }
  }

  @keyframes routeSpotTap {
    0% { opacity: 0.72; transform: scale(0.55); }
    100% { opacity: 0; transform: scale(1.45); }
  }

  @keyframes routeSpotBreathe {
    0%, 100% { transform: scale(0.92); opacity: 0.76; }
    50% { transform: scale(1.12); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .route-scroll-container,
    .route-scroll-map,
    .route-scroll-texture,
    .route-scroll-rod,
    .route-scroll-svg,
    .route-scroll-markers,
    .route-ink-segment,
    .route-spot-marker,
    .spot-marker__label,
    .spot-marker__icon {
      transition: none;
      animation: none;
    }
  }
`;

export default GalgameRouteScroll;
