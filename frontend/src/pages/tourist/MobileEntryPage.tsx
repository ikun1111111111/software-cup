import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CompassOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  LoadingOutlined,
  MobileOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { recordMobileTourEvent } from '../../api/analytics';
import { listRoutes, listSpots, type Spot, type TourRoute } from '../../api/spots';

type ViewMode = 'routes' | 'spots';

const FALLBACK_IMAGE = '/image/bigfo.png';
const MOBILE_SESSION_KEY = 'lingshan_mobile_bridge_session';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'web-mobile-session';
  const existing = window.localStorage.getItem(MOBILE_SESSION_KEY);
  if (existing) return existing;
  const next = `web-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(MOBILE_SESSION_KEY, next);
  return next;
};

const assetUrl = (value?: string | null) => {
  if (!value) return FALLBACK_IMAGE;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
  return `/${value}`;
};

const getRouteStops = (route: TourRoute | null, spotsById: Record<string, Spot>) => {
  if (!route) return [];
  return route.spot_order.map((spotId) => spotsById[spotId]).filter(Boolean);
};

const MobileEntryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('routes');
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);
  const sessionId = useMemo(getSessionId, []);
  const source = searchParams.get('from') || 'web-qr';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [routeList, spotList] = await Promise.all([listRoutes(), listSpots()]);
        if (cancelled) return;
        const activeRoutes = routeList.filter((route) => route.is_active !== false);
        const defaultRoute = activeRoutes[0] ?? null;
        const defaultSpotId = defaultRoute?.spot_order.find((spotId) => spotList.some((spot) => spot.id === spotId));
        setRoutes(activeRoutes);
        setSpots(spotList);
        setActiveRouteId(defaultRoute?.id ?? null);
        setActiveSpotId(defaultSpotId ?? spotList[0]?.id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void recordMobileTourEvent({
      sessionId,
      eventName: 'web_qr_opened',
      sourcePage: 'web_mobile_bridge',
      metadata: {
        from: source,
        user_agent: navigator.userAgent,
      },
    }).catch(() => undefined);
  }, [sessionId, source]);

  const spotsById = useMemo(
    () => Object.fromEntries(spots.map((spot) => [spot.id, spot])),
    [spots],
  );

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? routes[0] ?? null,
    [activeRouteId, routes],
  );

  const routeStops = useMemo(() => getRouteStops(activeRoute, spotsById), [activeRoute, spotsById]);

  const activeSpot = useMemo(
    () => spots.find((spot) => spot.id === activeSpotId) ?? routeStops[0] ?? spots[0] ?? null,
    [activeSpotId, routeStops, spots],
  );

  const heroImage = assetUrl(activeRoute?.cover_image);
  const heroTitle = activeRoute?.name || activeSpot?.name || '灵山移动导览';
  const heroSubtitle = activeRoute?.description || activeSpot?.overview || '随身查看景点、路线和讲解入口。';

  const handleRouteSelect = (route: TourRoute) => {
    setActiveRouteId(route.id);
    const firstStop = getRouteStops(route, spotsById)[0];
    if (firstStop) setActiveSpotId(firstStop.id);
    void recordMobileTourEvent({
      sessionId,
      eventName: 'route_started',
      routeId: route.id,
      routeName: route.name,
      sourcePage: 'web_mobile_bridge',
      metadata: { from: source },
    }).catch(() => undefined);
  };

  const handleSpotSelect = (spot: Spot) => {
    setActiveSpotId(spot.id);
    void recordMobileTourEvent({
      sessionId,
      eventName: 'spot_opened',
      spotId: spot.id,
      spotName: spot.name,
      routeId: activeRoute?.id,
      routeName: activeRoute?.name,
      sourcePage: 'web_mobile_bridge',
      metadata: { from: source },
    }).catch(() => undefined);
  };

  return (
    <main className="mobile-entry" aria-label="灵山移动导览">
      <section className="mobile-entry__hero">
        <img src={heroImage} alt="" />
        <div className="mobile-entry__heroShade" />
        <div className="mobile-entry__heroContent">
          <span className="mobile-entry__eyebrow"><MobileOutlined /> 扫码移动导览</span>
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </div>
      </section>

      <section className="mobile-entry__summary" aria-label="当前导览概览">
        <div>
          <strong>{routes.length || '-'}</strong>
          <span>路线</span>
        </div>
        <div>
          <strong>{spots.length || '-'}</strong>
          <span>景点</span>
        </div>
        <div>
          <strong>{routeStops.length || '-'}</strong>
          <span>当前站点</span>
        </div>
      </section>

      <nav className="mobile-entry__tabs" aria-label="移动导览视图">
        <button className={viewMode === 'routes' ? 'is-active' : ''} type="button" onClick={() => setViewMode('routes')}>
          <CompassOutlined /> 路线
        </button>
        <button className={viewMode === 'spots' ? 'is-active' : ''} type="button" onClick={() => setViewMode('spots')}>
          <EnvironmentOutlined /> 景点
        </button>
      </nav>

      {loading ? (
        <div className="mobile-entry__loading">
          <LoadingOutlined />
          <span>正在同步导览数据</span>
        </div>
      ) : viewMode === 'routes' ? (
        <section className="mobile-entry__section" aria-label="推荐路线">
          {routes.map((route) => {
            const selected = activeRoute?.id === route.id;
            const stops = getRouteStops(route, spotsById);
            return (
              <button
                key={route.id}
                type="button"
                className={`mobile-entry__route ${selected ? 'is-active' : ''}`}
                onClick={() => handleRouteSelect(route)}
              >
                <span className="mobile-entry__routeTop">
                  <strong>{route.name}</strong>
                  <em><FieldTimeOutlined /> {route.duration || '灵活游览'}</em>
                </span>
                <span className="mobile-entry__routeDesc">{route.description}</span>
                <span className="mobile-entry__stops">
                  {stops.slice(0, 4).map((spot) => (
                    <i key={spot.id}>{spot.name}</i>
                  ))}
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="mobile-entry__section" aria-label="景点列表">
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={`mobile-entry__spot ${activeSpot?.id === spot.id ? 'is-active' : ''}`}
              onClick={() => handleSpotSelect(spot)}
            >
              <img src={assetUrl(spot.thumbnail)} alt="" />
              <span>
                <strong>{spot.name}</strong>
                <em>{spot.duration || spot.category || '推荐停留'}</em>
              </span>
            </button>
          ))}
        </section>
      )}

      {activeSpot && (
        <section className="mobile-entry__detail" aria-label="当前景点">
          <span className="mobile-entry__detailMark">当前站点</span>
          <h2>{activeSpot.name}</h2>
          <p>{activeSpot.overview}</p>
          <Link
            to={`/chat?spot=${encodeURIComponent(activeSpot.id)}`}
            className="mobile-entry__chatLink"
            onClick={() => {
              void recordMobileTourEvent({
                sessionId,
                eventName: 'chat_opened',
                spotId: activeSpot.id,
                spotName: activeSpot.name,
                routeId: activeRoute?.id,
                routeName: activeRoute?.name,
                sourcePage: 'web_mobile_bridge',
                metadata: { from: source },
              }).catch(() => undefined);
            }}
          >
            <SendOutlined /> 问问数字人
          </Link>
        </section>
      )}

      <style>{`
        .mobile-entry {
          min-height: 100dvh;
          color: #241f1a;
          background:
            linear-gradient(180deg, rgba(253,251,247,0.78), rgba(239,232,218,0.96)),
            var(--texture-paper),
            #f7f5f0;
          font-family: var(--font-sans), 'PingFang SC', 'Microsoft YaHei', sans-serif;
          overflow-x: hidden;
        }

        .mobile-entry button,
        .mobile-entry a {
          font: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        .mobile-entry__hero {
          position: relative;
          height: 38dvh;
          min-height: 300px;
          overflow: hidden;
          border-bottom-left-radius: 26px;
          border-bottom-right-radius: 26px;
          background: #d8d0c2;
        }

        .mobile-entry__hero img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(0.92) contrast(0.98);
        }

        .mobile-entry__heroShade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(15,19,18,0.18), rgba(15,19,18,0.2) 38%, rgba(15,19,18,0.72)),
            radial-gradient(circle at 78% 18%, rgba(255,250,238,0.34), transparent 34%);
        }

        .mobile-entry__heroContent {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 24px;
          z-index: 3;
          color: #fffaf0;
        }

        .mobile-entry__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255,250,238,0.16);
          border: 1px solid rgba(255,250,238,0.24);
          font-size: 12px;
          font-weight: 800;
          backdrop-filter: blur(10px);
        }

        .mobile-entry__hero h1 {
          margin: 14px 0 8px;
          font-size: clamp(28px, 8vw, 38px);
          line-height: 1.08;
          letter-spacing: 0;
        }

        .mobile-entry__hero p {
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: rgba(255,250,240,0.84);
          font-size: 14px;
          line-height: 1.65;
        }

        .mobile-entry__summary {
          width: calc(100% - 32px);
          margin: -26px auto 16px;
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid rgba(96,76,42,0.12);
          border-radius: 8px;
          background: rgba(255,250,238,0.92);
          box-shadow: 0 18px 44px rgba(66,48,28,0.14);
          overflow: hidden;
        }

        .mobile-entry__summary div {
          min-height: 68px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 3px;
          border-right: 1px solid rgba(96,76,42,0.08);
        }

        .mobile-entry__summary div:last-child {
          border-right: none;
        }

        .mobile-entry__summary strong {
          font-size: 22px;
          line-height: 1;
        }

        .mobile-entry__summary span {
          color: rgba(42,37,32,0.54);
          font-size: 12px;
          font-weight: 700;
        }

        .mobile-entry__tabs {
          width: calc(100% - 32px);
          margin: 0 auto 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .mobile-entry__tabs button {
          min-height: 44px;
          border: 1px solid rgba(96,76,42,0.12);
          border-radius: 999px;
          background: rgba(255,250,238,0.62);
          color: rgba(42,37,32,0.64);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 900;
        }

        .mobile-entry__tabs button.is-active {
          color: #fffaf0;
          background: linear-gradient(135deg, #2d8b57, #6a9c89);
          border-color: transparent;
          box-shadow: 0 12px 24px rgba(45,139,87,0.18);
        }

        .mobile-entry__loading {
          min-height: 220px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          color: rgba(42,37,32,0.62);
          font-weight: 800;
        }

        .mobile-entry__section {
          width: calc(100% - 32px);
          margin: 0 auto;
          display: grid;
          gap: 10px;
          padding-bottom: 12px;
        }

        .mobile-entry__route,
        .mobile-entry__spot,
        .mobile-entry__detail {
          border: 1px solid rgba(96,76,42,0.12);
          border-radius: 8px;
          background: rgba(255,250,238,0.76);
          box-shadow: 0 12px 28px rgba(66,48,28,0.08);
        }

        .mobile-entry__route {
          display: grid;
          gap: 10px;
          padding: 14px;
          text-align: left;
          color: #241f1a;
          cursor: pointer;
        }

        .mobile-entry__route.is-active,
        .mobile-entry__spot.is-active {
          border-color: rgba(45,139,87,0.36);
          background: rgba(239,248,242,0.92);
        }

        .mobile-entry__routeTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .mobile-entry__routeTop strong,
        .mobile-entry__spot strong,
        .mobile-entry__detail h2 {
          font-size: 17px;
          line-height: 1.35;
        }

        .mobile-entry__routeTop em,
        .mobile-entry__spot em {
          color: rgba(42,37,32,0.54);
          font-size: 12px;
          font-style: normal;
          white-space: nowrap;
        }

        .mobile-entry__routeDesc {
          color: rgba(42,37,32,0.62);
          font-size: 13px;
          line-height: 1.62;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mobile-entry__stops {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .mobile-entry__stops i {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          color: rgba(42,37,32,0.68);
          background: rgba(255,255,255,0.58);
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }

        .mobile-entry__spot {
          min-height: 76px;
          display: grid;
          grid-template-columns: 62px 1fr;
          align-items: center;
          gap: 12px;
          padding: 8px;
          text-align: left;
          color: #241f1a;
          cursor: pointer;
        }

        .mobile-entry__spot img {
          width: 62px;
          height: 62px;
          border-radius: 8px;
          object-fit: cover;
          background: #dfd5c7;
        }

        .mobile-entry__spot span {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .mobile-entry__spot strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mobile-entry__detail {
          width: calc(100% - 32px);
          margin: 4px auto 24px;
          padding: 16px;
        }

        .mobile-entry__detailMark {
          display: inline-flex;
          margin-bottom: 8px;
          color: #2d8b57;
          font-size: 12px;
          font-weight: 900;
        }

        .mobile-entry__detail h2 {
          margin: 0;
        }

        .mobile-entry__detail p {
          margin: 8px 0 14px;
          color: rgba(42,37,32,0.68);
          font-size: 14px;
          line-height: 1.72;
        }

        .mobile-entry__chatLink {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          border-radius: 999px;
          color: #fffaf0;
          text-decoration: none;
          font-weight: 900;
          background: linear-gradient(135deg, #c84b31, #d8a84e);
          box-shadow: 0 14px 28px rgba(200,75,49,0.18);
        }

        @media (min-width: 560px) {
          .mobile-entry {
            width: 430px;
            min-height: 860px;
            margin: 0 auto;
            box-shadow: 0 0 0 1px rgba(96,76,42,0.08), 0 28px 80px rgba(42,37,32,0.18);
          }
        }
      `}</style>
    </main>
  );
};

export default MobileEntryPage;
