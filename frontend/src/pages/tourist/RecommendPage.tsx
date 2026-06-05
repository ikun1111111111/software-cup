import React, { useCallback, useEffect, useState } from 'react';
import { ClockCircleOutlined, CompassOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { listRoutes, getRouteById, type TourRoute, type TourRouteDetail } from '../../api/routes';
import { getSpotById, type SpotDetail } from '../../api/spots';

const INTEREST_OPTIONS = [
  { label: '历史文化', value: 'history' },
  { label: '自然风光', value: 'nature' },
  { label: '亲子活动', value: 'family' },
  { label: '全部路线', value: '' },
];

const RecommendPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [routeDetail, setRouteDetail] = useState<TourRouteDetail | null>(null);
  const [spotCache, setSpotCache] = useState<Record<string, SpotDetail>>({});
  const [loading, setLoading] = useState(false);
  const isMobile = false; // web-only

  useEffect(() => {
  }, []);

  // Fetch routes from backend
  useEffect(() => {
    setLoading(true);
    listRoutes(selectedType || undefined)
      .then((data) => {
        setRoutes(data);
      })
      .catch(() => {
        setRoutes([]);
      })
      .finally(() => setLoading(false));
  }, [selectedType]);

  // Fetch route detail when expanded
  const handleExpandRoute = useCallback(async (routeId: string) => {
    if (expandedRoute === routeId) {
      setExpandedRoute(null);
      setRouteDetail(null);
      return;
    }
    setExpandedRoute(routeId);
    setRouteDetail(null);
    try {
      const detail = await getRouteById(routeId);
      setRouteDetail(detail);
      // Pre-fetch spot details
      const spotIds = detail.spot_order || [];
      const cache: Record<string, SpotDetail> = {};
      await Promise.all(
        spotIds.map(async (id) => {
          try { cache[id] = await getSpotById(id); } catch { /* skip */ }
        })
      );
      setSpotCache(cache);
    } catch {
      setRouteDetail(null);
    }
  }, [expandedRoute]);

  const handleInterestChange = useCallback((value: string) => {
    setSelectedType(value);
  }, []);

  const renderRouteCard = useCallback((route: TourRoute, index: number) => {
    const isExpanded = expandedRoute === route.id;
    return (
      <div
        key={route.id}
        data-testid={`route-card-${route.id}`}
        className="card-hover animate-fade-in-up"
        style={{
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '16px',
          backgroundColor: 'var(--surface-card)',
          animationDelay: `${index * 80}ms`,
        }}
      >
        {/* Gradient header */}
        <div
          style={{
            padding: isMobile ? '16px' : '20px',
            background: route.gradient || 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
            color: '#fff',
            cursor: 'pointer',
          }}
          onClick={() => handleExpandRoute(route.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? '15px' : '16px', fontWeight: 600 }}>
              {route.name}
            </h3>
            {isExpanded ? <UpOutlined style={{ fontSize: '12px' }} /> : <DownOutlined style={{ fontSize: '12px' }} />}
          </div>
          <div style={{
            display: 'flex', gap: '20px', marginTop: '8px',
            fontSize: '13px', opacity: 0.9,
          }}>
            <span><ClockCircleOutlined /> {route.duration}</span>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
          <p style={{
            color: 'var(--text-secondary)', margin: '0 0 12px 0',
            fontSize: '14px', lineHeight: 1.6,
          }}>
            {route.description}
          </p>

          {/* Expanded detail */}
          {isExpanded && routeDetail && (
            <div style={{
              marginTop: '16px', paddingTop: '16px',
              borderTop: '1px solid var(--border-light)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                路线景点
              </div>
              {routeDetail.spot_order.map((spotId, i) => {
                const spot = spotCache[spotId];
                const detail = routeDetail.spot_details?.[spotId];
                return (
                  <div
                    key={spotId}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--color-primary)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {spot?.name || spotId}
                      </span>
                    </div>
                    {spot?.overview && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {spot.overview}
                      </div>
                    )}
                    {detail?.讲解重点 && detail.讲解重点.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>讲解重点：</div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                          {detail.讲解重点.map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {detail?.特色体验 && detail.特色体验.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '6px' }}>
                        <div style={{ fontWeight: 500 }}>特色体验：</div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                          {detail.特色体验.map((e, j) => <li key={j}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }, [expandedRoute, routeDetail, spotCache, handleExpandRoute, isMobile]);

  return (
    <div data-testid="recommend-page" className="ink-wash-bg" style={{
      padding: isMobile ? '16px' : '24px',
      maxWidth: '800px',
      margin: '0 auto',
      paddingBottom: isMobile ? '80px' : '24px',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CompassOutlined style={{ color: 'var(--color-primary)' }} />
          个性化路线推荐
        </h2>
        <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px' }}>
          选择你的兴趣，为你定制专属游览路线
        </p>
      </div>

      {/* Interest tags */}
      <div className="scroll-tags" data-testid="interest-tags" style={{
        marginBottom: '20px',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}>
        {INTEREST_OPTIONS.map((option) => {
          const selected = selectedType === option.value;
          return (
            <button
              key={option.value}
              data-testid={`tag-${option.value || 'all'}`}
              onClick={() => handleInterestChange(option.value)}
              className={selected ? 'btn-pill active' : 'btn-pill'}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderColor: selected ? 'var(--color-primary)' : undefined,
                backgroundColor: selected ? 'var(--color-primary-bg)' : undefined,
                color: selected ? 'var(--color-primary)' : undefined,
                fontWeight: selected ? 600 : undefined,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div data-testid="route-list" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 200ms' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : routes.length > 0 ? (
          routes.map((route, index) => renderRouteCard(route, index))
        ) : (
          <div data-testid="empty-state" className="animate-fade-in" style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'var(--text-tertiary)', backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)',
          }}>
            <CompassOutlined style={{ fontSize: '40px', marginBottom: '12px', color: 'var(--gray-300)' }} />
            <div style={{ fontSize: '15px', fontWeight: 500 }}>暂无匹配的推荐路线</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPage;
