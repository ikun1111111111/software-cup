import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import GalgameRouteScroll from '../Galgame/GalgameRouteScroll';
import MiniRouteTimeline from '../Galgame/MiniRouteTimeline';
import { listRoutes, listSpots, type Spot, type TourRoute } from '../../api/spots';
import type { RouteData, RouteSpot } from '../Galgame/routeData';

interface KioskRouteMapPanelProps {
  currentSpotIds: string[];
  currentSpotName: string;
  isNarrating?: boolean;
  onExit?: () => void;
  onRouteSelected?: (payload: KioskRouteSelection) => void;
  onRouteSpotFocus?: (payload: KioskRouteSpotFocus) => void;
}

export interface KioskRouteSelection {
  routeName: string;
  routeDuration: string;
  routeDescription: string;
  narration: string;
}

export interface KioskRouteSpotFocus {
  routeName: string;
  routeDuration: string;
  spotName: string;
  spotDuration: string;
  spotDescription: string;
  index: number;
  total: number;
}

type OfficialSpotDetail = {
  讲解重点?: unknown;
  特色体验?: unknown;
  highlights?: unknown;
  experiences?: unknown;
};

const ROUTE_TYPE_LABELS: Record<string, string> = {
  history: '人文深读',
  culture: '人文深读',
  nature: '山水轻游',
  family: '亲子友好',
  custom: '定制路线',
};

function toRouteData(route: TourRoute, spotsById: Record<string, Spot>): RouteData {
  const spots: RouteSpot[] = route.spot_order
    .map((spotId) => {
      const spot = spotsById[spotId];
      if (!spot) return null;
      return {
        id: spot.id,
        name: spot.name,
        icon: spot.thumbnail ? `/${spot.thumbnail}` : '/image/icons/icon-default.png',
        x: spot.display_x ?? 50,
        y: spot.display_y ?? 50,
        description: spot.overview || '',
        duration: spot.duration || '',
        qa: spot.qa_json || [],
      };
    })
    .filter(Boolean) as RouteSpot[];

  return {
    id: route.id,
    name: route.name,
    duration: route.duration,
    color: route.color || '#8B6B4A',
    brushImage: route.brush_image ? `/${route.brush_image}` : '/image/brushes/brush-ink.png',
    spots,
    openingText: route.opening_text || route.description || `推荐你沿着「${route.name}」继续游览。`,
    closingText: route.closing_text || '这条路线适合按当前节奏慢慢走，留意现场开放与演出时间。',
  };
}

function getActiveRoutes(routes: TourRoute[]): TourRoute[] {
  return routes.filter((route) => route.is_active !== false && route.spot_order?.length);
}

function chooseRoute(routes: TourRoute[], currentSpotIds: string[]): TourRoute | null {
  const activeRoutes = getActiveRoutes(routes);
  const matched = activeRoutes.find((route) =>
    currentSpotIds.some((spotId) => route.spot_order.includes(spotId))
  );
  return matched || activeRoutes[0] || null;
}

function getOfficialSpotDetail(route: TourRoute | null, spotId: string): OfficialSpotDetail {
  if (!route?.spot_details) return {};
  const rawDetail = route.spot_details[spotId];
  return rawDetail && typeof rawDetail === 'object' ? (rawDetail as OfficialSpotDetail) : {};
}

function toStringList(value: unknown, limit = 3): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit)
    : [];
}

function getHighlights(route: TourRoute | null, spotId: string): string[] {
  const detail = getOfficialSpotDetail(route, spotId);
  return toStringList(detail.讲解重点 ?? detail.highlights);
}

function getExperiences(route: TourRoute | null, spotId: string): string[] {
  const detail = getOfficialSpotDetail(route, spotId);
  return toStringList(detail.特色体验 ?? detail.experiences, 2);
}

function findCurrentSpotIndex(routeData: RouteData, currentSpotIds: string[]): number {
  return routeData.spots.findIndex((spot) => currentSpotIds.includes(spot.id));
}

function buildRouteSelectionNarration(
  route: TourRoute,
  routeData: RouteData,
  currentSpotName: string,
  matchedIndex: number
): string {
  const stationNames = routeData.spots.map((spot, index) => `${index + 1}.${spot.name}`).join('、');
  const officialHighlights = routeData.spots
    .flatMap((spot) => getHighlights(route, spot.id).map((text) => `${spot.name}：${text}`))
    .slice(0, 4);
  const routeStartName = routeData.spots[0]?.name;
  const locationHint =
    matchedIndex >= 0
      ? `你现在就在这条路线的第${matchedIndex + 1}站，我会从「${routeData.spots[matchedIndex].name}」开始定位讲解。`
      : routeStartName
        ? `提醒一下：你现在在「${currentSpotName}」，这条路线不经过当前点位。我先把卷轴定位到路线第1站「${routeStartName}」，你可以继续查看，也可以点“换一条路线”。`
        : null;

  return [
    routeData.openingText,
    locationHint,
    `这条「${routeData.name}」大约需要${routeData.duration}，一共${routeData.spots.length}站：${stationNames}。`,
    officialHighlights.length
      ? `我会重点讲这几处：${officialHighlights.join('；')}。`
      : route.description,
    '右侧卷轴已经放大，你可以点任意节点让我补充讲解；讲完后点“退出路线推荐”，就能回到正常问答。',
  ]
    .filter(Boolean)
    .join('\n');
}

const KioskRouteMapPanel: React.FC<KioskRouteMapPanelProps> = ({
  currentSpotIds,
  currentSpotName,
  isNarrating = false,
  onExit,
  onRouteSelected,
  onRouteSpotFocus,
}) => {
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [spotsById, setSpotsById] = useState<Record<string, Spot>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([listRoutes(), listSpots()])
      .then(([nextRoutes, nextSpots]) => {
        if (cancelled) return;
        setRoutes(nextRoutes);
        setSpotsById(Object.fromEntries(nextSpots.map((spot) => [spot.id, spot])));
      })
      .catch((err) => {
        console.error('Failed to load kiosk route map', err);
        if (!cancelled) setError('路线图暂时没有加载出来，请稍后再试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoutes = useMemo(() => getActiveRoutes(routes), [routes]);
  const recommendedRouteId = useMemo(() => chooseRoute(routes, currentSpotIds)?.id ?? null, [currentSpotIds, routes]);
  const selectedRoute = useMemo(
    () => activeRoutes.find((route) => route.id === selectedRouteId) || null,
    [activeRoutes, selectedRouteId]
  );
  const routeData = useMemo(
    () => (selectedRoute ? toRouteData(selectedRoute, spotsById) : null),
    [selectedRoute, spotsById]
  );
  const currentSpotMatchIndex = useMemo(
    () => (routeData ? findCurrentSpotIndex(routeData, currentSpotIds) : -1),
    [currentSpotIds, routeData]
  );
  const currentSpotOffSelectedRoute = Boolean(routeData && selectedRoute && currentSpotMatchIndex < 0);

  useEffect(() => {
    if (!routeData) return;
    setCurrentSpotIndex(currentSpotMatchIndex >= 0 ? currentSpotMatchIndex : 0);
  }, [currentSpotMatchIndex, routeData]);

  const handleRouteSelect = useCallback(
    (route: TourRoute) => {
      const nextRouteData = toRouteData(route, spotsById);
      const matchedIndex = findCurrentSpotIndex(nextRouteData, currentSpotIds);
      setSelectedRouteId(route.id);
      setCurrentSpotIndex(matchedIndex >= 0 ? matchedIndex : 0);
      onRouteSelected?.({
        routeName: nextRouteData.name,
        routeDuration: nextRouteData.duration,
        routeDescription: route.description,
        narration: buildRouteSelectionNarration(route, nextRouteData, currentSpotName, matchedIndex),
      });
    },
    [currentSpotIds, currentSpotName, onRouteSelected, spotsById]
  );

  const handleSpotFocus = useCallback(
    (index: number) => {
      if (!routeData) return;
      const spot = routeData.spots[index];
      if (!spot) return;
      setCurrentSpotIndex(index);
      onRouteSpotFocus?.({
        routeName: routeData.name,
        routeDuration: routeData.duration,
        spotName: spot.name,
        spotDuration: spot.duration,
        spotDescription: spot.description,
        index,
        total: routeData.spots.length,
      });
    },
    [onRouteSpotFocus, routeData]
  );

  const focusedSpot = routeData?.spots[currentSpotIndex] || routeData?.spots[0] || null;
  const focusedHighlights = focusedSpot ? getHighlights(selectedRoute, focusedSpot.id) : [];
  const focusedExperiences = focusedSpot ? getExperiences(selectedRoute, focusedSpot.id) : [];
  const routeStartName = routeData?.spots[0]?.name || '路线起点';

  if (loading) {
    return (
      <div className="kiosk-route-panel kiosk-route-panel--empty" data-testid="kiosk-route-map-panel">
        <LoadingOutlined />
        <span>正在展开路线卷轴…</span>
      </div>
    );
  }

  if (error || activeRoutes.length === 0) {
    return (
      <div className="kiosk-route-panel kiosk-route-panel--empty" data-testid="kiosk-route-map-panel">
        <strong>路线图稍后再来</strong>
        <span>{error || `暂时没有找到从${currentSpotName}出发的路线。`}</span>
        {onExit && (
          <button className="kiosk-route-panel__exit" data-testid="kiosk-route-exit" onClick={onExit}>
            退出路线推荐
          </button>
        )}
      </div>
    );
  }

  if (!routeData || !selectedRoute) {
    return (
      <div className="kiosk-route-panel kiosk-route-panel--chooser" data-testid="kiosk-route-map-panel">
        <div className="kiosk-route-panel__header">
          <span>路线推荐</span>
          <strong>先选一条想走的路线</strong>
          <small>{currentSpotName} · 小景会按你的偏好展开卷轴地图</small>
        </div>

        <div className="kiosk-route-chooser__list" data-testid="kiosk-route-choice-list">
          {activeRoutes.map((route) => {
            const isRecommended = route.id === recommendedRouteId;
            const typeLabel = ROUTE_TYPE_LABELS[route.route_type] || '精选路线';
            const includesCurrentSpot = currentSpotIds.some((spotId) => route.spot_order.includes(spotId));
            return (
              <button
                key={route.id}
                className={`kiosk-route-choice ${isRecommended ? 'is-recommended' : ''} ${includesCurrentSpot ? '' : 'is-off-current'}`}
                data-testid={`kiosk-route-choice-${route.id}`}
                onClick={() => handleRouteSelect(route)}
              >
                <span className="kiosk-route-choice__seal">{isRecommended ? '荐' : route.spot_order.length}</span>
                <span className="kiosk-route-choice__body">
                  <span className="kiosk-route-choice__meta">
                    {typeLabel} · {route.duration} · {route.spot_order.length}站
                  </span>
                  <strong>{route.name}</strong>
                  <small>{route.description}</small>
                  <em className={includesCurrentSpot ? 'is-match' : 'is-away'}>
                    {includesCurrentSpot ? '包含当前点位，可从这里接着走' : `当前点位不在此路线，将从第 1 站开始展示`}
                  </em>
                </span>
                <span className="kiosk-route-choice__arrow">展开</span>
              </button>
            );
          })}
        </div>

        <div className="kiosk-route-chooser__hint">
          <span>选择后会隐藏下方快捷按钮，并把右侧地图放大；你仍然可以点节点听单站讲解。</span>
          {onExit && (
            <button className="kiosk-route-panel__exit" data-testid="kiosk-route-exit" onClick={onExit}>
              退出路线推荐
            </button>
          )}
        </div>

        <style>{panelStyles}</style>
      </div>
    );
  }

  return (
    <div className="kiosk-route-panel kiosk-route-panel--detail" data-testid="kiosk-route-map-panel">
      <div className="kiosk-route-panel__header kiosk-route-panel__header--detail">
        <div>
          <span>导览卷轴</span>
          <strong>{routeData.name}</strong>
          <small>
            {routeData.spots.length}站 · 预计 {routeData.duration} ·{' '}
            {currentSpotOffSelectedRoute
              ? `当前在 ${currentSpotName}，该路线从 ${routeStartName} 开始`
              : `当前从 ${currentSpotName} 出发`}
          </small>
        </div>
        <div className="kiosk-route-panel__actions">
          <button onClick={() => setSelectedRouteId(null)}>换一条路线</button>
          {onExit && (
            <button className="kiosk-route-panel__exit" data-testid="kiosk-route-exit" onClick={onExit}>
              退出路线推荐
            </button>
          )}
        </div>
        {currentSpotOffSelectedRoute && (
          <div className="kiosk-route-panel__notice" data-testid="kiosk-route-away-notice">
            <strong>当前点位不在此路线</strong>
            <span>
              {`你现在在「${currentSpotName}」，「${routeData.name}」将从第 1 站「${routeStartName}」开始展示。可以继续查看，也可以点“换一条路线”选择包含当前点位的路线。`}
            </span>
          </div>
        )}
      </div>

      <div className="kiosk-route-panel__map" data-testid="kiosk-route-detail-map">
        <div className="kiosk-route-panel__map-badge">
          <span>{isNarrating ? '小景讲解中' : '卷轴已就绪'}</span>
          <small>点击节点切换讲解</small>
        </div>
        {focusedSpot && (
          <div className="kiosk-route-panel__map-focus" key={focusedSpot.id}>
            <span>{currentSpotOffSelectedRoute && currentSpotIndex === 0 ? '路线起点' : '当前节点'}</span>
            <strong>
              {currentSpotIndex + 1}. {focusedSpot.name}
            </strong>
            <small>{focusedSpot.duration || '跟随现场节奏停留'}</small>
          </div>
        )}
        <GalgameRouteScroll
          route={routeData}
          currentSpotIndex={currentSpotIndex}
          isVisible
          onSpotClick={handleSpotFocus}
        />
      </div>

      <section className="kiosk-route-panel__guide">
        <article className="kiosk-route-panel__brief">
          <span>路线讲解</span>
          <p>{routeData.openingText}</p>
          {focusedSpot && (
            <div className="kiosk-route-panel__focus">
              <strong>
                第 {currentSpotIndex + 1} 站 · {focusedSpot.name}
              </strong>
              <small>{focusedSpot.duration || '建议按现场节奏停留'}</small>
              <p>{focusedSpot.description || '这里适合停下来听一段讲解，再决定是否继续前往下一站。'}</p>
              {(focusedHighlights.length > 0 || focusedExperiences.length > 0) && (
                <ul>
                  {[...focusedHighlights, ...focusedExperiences].slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </article>

        <div className="kiosk-route-panel__timeline">
          <MiniRouteTimeline
            route={routeData}
            currentSpotIndex={currentSpotIndex}
            onSpotClick={handleSpotFocus}
          />
        </div>
      </section>

      <style>{panelStyles}</style>
    </div>
  );
};

const panelStyles = `
  .kiosk-route-panel {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    display: grid;
    gap: clamp(10px, 1vw, 16px);
    color: #2a2520;
  }

  .kiosk-route-panel--empty {
    place-items: center;
    place-content: center;
    color: rgba(42,37,32,0.62);
    text-align: center;
    font-size: clamp(15px, 1.1vw, 18px);
  }

  .kiosk-route-panel--chooser {
    grid-template-rows: auto minmax(0, 1fr) auto;
    animation: routeChooserIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .kiosk-route-panel--detail {
    grid-template-rows: auto minmax(270px, 0.82fr) minmax(168px, 0.52fr);
    animation: routeDetailIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .kiosk-route-panel__header {
    display: grid;
    gap: 5px;
  }

  .kiosk-route-panel__header--detail {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 14px;
  }

  .kiosk-route-panel__header span,
  .kiosk-route-panel__brief > span {
    color: color-mix(in srgb, var(--spot-accent) 72%, #6b4c25);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.22em;
  }

  .kiosk-route-panel__header strong {
    color: #2a2520;
    font-family: var(--font-calligraphy), 'STKaiti', 'KaiTi', serif;
    font-size: clamp(23px, 1.75vw, 34px);
    letter-spacing: 0.08em;
    line-height: 1.18;
  }

  .kiosk-route-panel__header small {
    color: rgba(42,37,32,0.58);
    font-size: clamp(13px, 0.9vw, 15px);
    line-height: 1.38;
  }

  .kiosk-route-panel__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .kiosk-route-panel__actions button,
  .kiosk-route-panel__exit {
    min-height: 34px;
    border: 1px solid rgba(96,76,42,0.16);
    border-radius: 999px;
    background: rgba(255,250,238,0.68);
    color: rgba(42,37,32,0.72);
    padding: 0 13px;
    cursor: pointer;
    font-weight: 800;
    transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
  }

  .kiosk-route-panel__exit {
    border-color: color-mix(in srgb, var(--spot-accent) 36%, rgba(96,76,42,0.16));
    color: color-mix(in srgb, var(--spot-accent) 70%, #4c301c);
  }

  .kiosk-route-panel__actions button:hover,
  .kiosk-route-panel__exit:hover,
  .kiosk-route-choice:hover {
    transform: translateY(-1px);
    background: rgba(255,250,238,0.92);
  }

  .kiosk-route-chooser__list {
    min-height: 0;
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 12px;
    padding-right: 4px;
  }

  .kiosk-route-choice {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: clamp(14px, 1.2vw, 20px);
    border: 1px solid rgba(96,76,42,0.13);
    border-radius: 24px;
    background:
      linear-gradient(135deg, rgba(255,250,238,0.72), rgba(239,224,195,0.46)),
      radial-gradient(circle at 10% 10%, var(--spot-accent-soft), transparent 42%);
    color: inherit;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(92,70,38,0.08);
    transform: translate3d(0, 0, 0);
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    will-change: transform;
  }

  .kiosk-route-choice.is-recommended {
    border-color: color-mix(in srgb, var(--spot-accent) 42%, rgba(96,76,42,0.14));
  }

  .kiosk-route-choice.is-off-current {
    border-style: dashed;
  }

  .kiosk-route-choice:hover {
    border-color: color-mix(in srgb, var(--spot-accent) 46%, rgba(96,76,42,0.18));
    box-shadow: 0 16px 34px rgba(92,70,38,0.11);
  }

  .kiosk-route-choice:active {
    transform: translateY(0) scale(0.992);
  }

  .kiosk-route-choice__seal {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--spot-accent);
    color: #fffaf0;
    font-family: var(--font-calligraphy), 'STKaiti', 'KaiTi', serif;
    font-size: 20px;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--spot-accent) 28%, transparent);
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .kiosk-route-choice:hover .kiosk-route-choice__seal {
    transform: rotate(-4deg) scale(1.05);
  }

  .kiosk-route-choice__body {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .kiosk-route-choice__meta {
    color: color-mix(in srgb, var(--spot-accent) 76%, #6b4c25);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  .kiosk-route-choice__body strong {
    font-size: clamp(18px, 1.35vw, 25px);
    letter-spacing: 0.04em;
  }

  .kiosk-route-choice__body small {
    color: rgba(42,37,32,0.58);
    font-size: clamp(13px, 0.92vw, 15px);
    line-height: 1.55;
  }

  .kiosk-route-choice__body em {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 9px;
    border-radius: 999px;
    font-style: normal;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .kiosk-route-choice__body em.is-match {
    color: color-mix(in srgb, var(--spot-accent) 76%, #365a38);
    background: color-mix(in srgb, var(--spot-accent-soft) 62%, rgba(255,250,238,0.72));
  }

  .kiosk-route-choice__body em.is-away {
    color: #8a5a24;
    background: rgba(216,168,78,0.16);
    border: 1px solid rgba(216,168,78,0.22);
  }

  .kiosk-route-choice__arrow {
    color: rgba(42,37,32,0.46);
    font-weight: 900;
    white-space: nowrap;
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), color 160ms ease;
  }

  .kiosk-route-choice:hover .kiosk-route-choice__arrow {
    color: color-mix(in srgb, var(--spot-accent) 70%, #4c301c);
    transform: translateX(4px);
  }

  .kiosk-route-chooser__hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding-top: 2px;
    color: rgba(42,37,32,0.56);
    font-size: 13px;
    line-height: 1.6;
  }

  .kiosk-route-panel__notice {
    grid-column: 1 / -1;
    display: grid;
    gap: 4px;
    margin-top: 3px;
    padding: 10px 12px;
    border-radius: 18px;
    border: 1px solid rgba(216,168,78,0.24);
    background:
      linear-gradient(135deg, rgba(255,248,229,0.84), rgba(255,250,238,0.66)),
      radial-gradient(circle at 0 0, rgba(216,168,78,0.18), transparent 44%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.58);
    animation: routeNoticeIn 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .kiosk-route-panel__notice strong {
    color: #7d4e18;
    font-size: 13px;
    letter-spacing: 0.08em;
  }

  .kiosk-route-panel__notice span {
    color: rgba(42,37,32,0.68);
    font-size: 13px;
    line-height: 1.5;
  }

  .kiosk-route-panel__map {
    position: relative;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    border-radius: clamp(24px, 2vw, 34px);
    border: 1px solid rgba(96,76,42,0.13);
    background:
      radial-gradient(circle at 72% 36%, rgba(106,156,137,0.16), transparent 34%),
      linear-gradient(135deg, rgba(255,250,238,0.86), rgba(235,220,190,0.58)),
      url('/image/map-bg-texture.jpg');
    background-size: cover;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.48), 0 18px 46px rgba(92,70,38,0.12);
    contain: layout paint style;
    transform: translate3d(0, 0, 0);
    animation: routeMapIn 420ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
  }

  .kiosk-route-panel__map-badge {
    position: absolute;
    top: 14px;
    right: 16px;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(253,251,247,0.86);
    border: 1px solid rgba(180,160,130,0.30);
    box-shadow: 0 8px 18px rgba(42,37,32,0.08);
    backdrop-filter: blur(8px);
  }

  .kiosk-route-panel__map-badge span {
    color: color-mix(in srgb, var(--spot-accent) 72%, #6b4c25);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.14em;
  }

  .kiosk-route-panel__map-badge small {
    color: rgba(42,37,32,0.54);
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  .kiosk-route-panel__map-focus {
    position: absolute;
    left: 18px;
    bottom: 16px;
    z-index: 8;
    max-width: min(310px, 42%);
    display: grid;
    gap: 3px;
    padding: 11px 14px;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--spot-accent) 28%, rgba(180,160,130,0.24));
    background: linear-gradient(135deg, rgba(255,253,248,0.92), rgba(244,231,204,0.76));
    box-shadow: 0 10px 24px rgba(62,45,24,0.10);
    pointer-events: none;
    animation: routeMapFocusIn 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .kiosk-route-panel__map-focus span {
    color: color-mix(in srgb, var(--spot-accent) 74%, #6b4c25);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  .kiosk-route-panel__map-focus strong {
    color: #2a2520;
    font-size: clamp(16px, 1.05vw, 20px);
    line-height: 1.24;
  }

  .kiosk-route-panel__map-focus small {
    color: rgba(42,37,32,0.58);
    font-size: 12px;
  }

  .kiosk-route-panel__map .route-scroll-container {
    inset: 0 !important;
    z-index: 3 !important;
  }

  .kiosk-route-panel__map .route-scroll-container > div:first-child,
  .kiosk-route-panel__map .route-scroll-container > div:last-child {
    width: clamp(30px, 3vw, 46px) !important;
  }

  .kiosk-route-panel__map .route-scroll-container > div:nth-child(2) {
    border-radius: 20px;
  }

  .kiosk-route-panel__guide {
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(250px, 0.52fr);
    gap: clamp(12px, 1.2vw, 18px);
  }

  .kiosk-route-panel__brief,
  .kiosk-route-panel__timeline {
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
    border: 1px solid rgba(96,76,42,0.10);
    border-radius: 22px;
    background: rgba(255,250,238,0.56);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.52);
    animation: routeInfoIn 360ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both;
  }

  .kiosk-route-panel__brief {
    overflow: auto;
    padding: clamp(14px, 1.2vw, 18px);
  }

  .kiosk-route-panel__brief p {
    margin: 8px 0 0;
    color: rgba(42,37,32,0.72);
    line-height: 1.72;
    font-size: clamp(14px, 1vw, 16px);
  }

  .kiosk-route-panel__focus {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed rgba(96,76,42,0.16);
  }

  .kiosk-route-panel__focus strong {
    display: block;
    font-size: clamp(17px, 1.2vw, 22px);
    letter-spacing: 0.04em;
  }

  .kiosk-route-panel__focus small {
    display: block;
    margin-top: 3px;
    color: color-mix(in srgb, var(--spot-accent) 70%, #6b4c25);
    font-weight: 800;
  }

  .kiosk-route-panel__focus ul {
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    list-style: none;
  }

  .kiosk-route-panel__focus li {
    position: relative;
    padding-left: 16px;
    color: rgba(42,37,32,0.66);
    font-size: 13px;
    line-height: 1.55;
  }

  .kiosk-route-panel__focus li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.72em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--spot-accent);
  }

  .kiosk-route-panel__timeline {
    display: flex;
    min-height: 0;
  }

  .kiosk-route-panel__timeline > div {
    width: 100% !important;
    max-height: none !important;
    min-height: 0 !important;
    flex: 1;
    border: 0 !important;
    border-radius: 22px !important;
    box-shadow: none !important;
    background: rgba(253,251,247,0.76) !important;
  }

  @keyframes routeChooserIn {
    from { opacity: 0; transform: translate3d(18px, 0, 0) scale(0.992); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  @keyframes routeDetailIn {
    from { opacity: 0; transform: translate3d(18px, 0, 0) scale(0.992); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  @keyframes routeMapIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.992); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  @keyframes routeInfoIn {
    from { opacity: 0; transform: translate3d(0, 10px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }

  @keyframes routeNoticeIn {
    from { opacity: 0; transform: translate3d(0, -4px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }

  @keyframes routeMapFocusIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  @media (max-width: 1380px) {
    .kiosk-route-panel--detail {
      grid-template-rows: auto minmax(250px, 0.82fr) minmax(160px, 0.52fr);
    }

    .kiosk-route-panel__guide {
      grid-template-columns: 1fr;
    }

    .kiosk-route-panel__timeline {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .kiosk-route-panel--chooser,
    .kiosk-route-panel--detail,
    .kiosk-route-panel__map,
    .kiosk-route-panel__brief,
    .kiosk-route-panel__timeline,
    .kiosk-route-panel__map-focus,
    .kiosk-route-panel__notice,
    .kiosk-route-choice,
    .kiosk-route-choice__seal,
    .kiosk-route-choice__arrow {
      animation: none;
      transition: none;
    }
  }
`;

export default memo(KioskRouteMapPanel);
