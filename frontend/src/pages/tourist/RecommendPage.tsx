import React, { useCallback, useEffect, useState } from 'react';
import { ClockCircleOutlined, CompassOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { listRoutes, getRouteById, type TourRoute, type TourRouteDetail } from '../../api/routes';
import { getSpotById, type SpotDetail } from '../../api/spots';
import { getDNAProfile, getDNARecommendations, type DNAProfile, type DNARecommendResponse } from '../../api/routes';
import RecommendEngine from '../../components/Recommend/RecommendEngine';
import RoutePushButton from '../../components/Recommend/RoutePushButton';
import DNARadarChart from '../../components/tourist/DNARadarChart';
import DNATag from '../../components/tourist/DNATag';
import type { RecommendationResult } from '../../api/routes';

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
  const [aiRecs, setAiRecs] = useState<RecommendationResult[]>([]);
  const [roomId, setRoomId] = useState<string | null>(
    () => sessionStorage.getItem('active_room_id'),
  );

  // DNA state
  const [dnaProfile, setDnaProfile] = useState<DNAProfile | null>(null);
  const [dnaRecs, setDnaRecs] = useState<DNARecommendResponse | null>(null);
  const [dnaLoading, setDnaLoading] = useState(false);

  const isMobile = false;
  const sessionId = sessionStorage.getItem('session_id') || 'anonymous';

  // Listen for room changes
  useEffect(() => {
    const handler = () => {
      setRoomId(sessionStorage.getItem('active_room_id'));
    };
    window.addEventListener('room_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('room_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Load DNA profile and recommendations
  useEffect(() => {
    const loadDNA = async () => {
      setDnaLoading(true);
      try {
        const [profile, recs] = await Promise.all([
          getDNAProfile(sessionId),
          getDNARecommendations(sessionId, 5),
        ]);
        setDnaProfile(profile);
        setDnaRecs(recs);
      } catch (err: any) {
        // DNA not available for new users without behavior data
        console.log('DNA data not available:', err?.message);
      } finally {
        setDnaLoading(false);
      }
    };
    loadDNA();
  }, [sessionId]);

  // Fetch routes from backend
  useEffect(() => {
    setLoading(true);
    listRoutes(selectedType || undefined)
      .then((res) => {
        const data = (res as any)?.data ?? res;
        setRoutes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRoutes([]);
      })
      .finally(() => setLoading(false));
  }, [selectedType]);

  const handleSelectRec = useCallback((rec: RecommendationResult) => {
    // Find matching route and expand it
    const found = routes.find((r) => r.id === rec.route_id);
    if (found) {
      setExpandedRoute(found.id);
      getRouteById(found.id)
        .then((res) => {
          const detail = (res as any)?.data ?? res;
          setRouteDetail(detail);
          const spotIds: string[] = detail.spot_order || [];
          const cache: Record<string, SpotDetail> = {};
          Promise.all(
            spotIds.map(async (spotId: string) => {
              try {
                const sRes = await getSpotById(spotId);
                cache[spotId] = (sRes as any)?.data ?? sRes;
              } catch {
                /* skip */
              }
            }),
          ).then(() => setSpotCache(cache));
        })
        .catch(() => setRouteDetail(null));
    }
  }, [routes]);

  // Fetch route detail when expanded
  const handleExpandRoute = useCallback(
    async (routeId: string) => {
      if (expandedRoute === routeId) {
        setExpandedRoute(null);
        setRouteDetail(null);
        return;
      }
      setExpandedRoute(routeId);
      setRouteDetail(null);
      try {
        const res = await getRouteById(routeId);
        const detail = (res as any)?.data ?? res;
        setRouteDetail(detail);
        const spotIds: string[] = detail.spot_order || [];
        const cache: Record<string, SpotDetail> = {};
        await Promise.all(
          spotIds.map(async (spotId: string) => {
            try {
              const sRes = await getSpotById(spotId);
              cache[spotId] = (sRes as any)?.data ?? sRes;
            } catch {
              /* skip */
            }
          }),
        );
        setSpotCache(cache);
      } catch {
        setRouteDetail(null);
      }
    },
    [expandedRoute],
  );

  const handleRecommendations = useCallback((recs: RecommendationResult[]) => {
    setAiRecs(recs);
  }, []);

  const handleInterestChange = useCallback((value: string) => {
    setSelectedType(value);
  }, []);

  const renderRouteCard = useCallback(
    (route: TourRoute, index: number) => {
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
          <div
            style={{
              padding: isMobile ? '16px' : '20px',
              background: route.gradient || 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
              color: '#fff',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => handleExpandRoute(route.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{
                margin: 0, fontSize: '18px', fontWeight: 700,
                fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
              }}>
                {route.name}
              </h3>
              {isExpanded ? <UpOutlined style={{ fontSize: '12px' }} /> : <DownOutlined style={{ fontSize: '12px' }} />}
            </div>
            <div
              style={{
                display: 'flex', gap: '20px', marginTop: '8px',
                fontSize: '14px', opacity: 0.9,
                fontFamily: 'var(--font-serif)',
              }}
            >
              <span>
                <ClockCircleOutlined /> {route.duration}
              </span>
            </div>
          </div>

          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
            <p
              style={{
                color: 'var(--text-secondary)', margin: '0 0 12px 0',
                fontSize: '15px', lineHeight: 1.8,
                fontFamily: 'var(--font-serif)',
              }}
            >
              {route.description}
            </p>

            {isExpanded && routeDetail && (
              <div
                style={{
                  marginTop: '16px', paddingTop: '16px',
                  borderTop: '1px solid var(--border-light)',
                }}
              >
                <div style={{
                  fontSize: '15px', fontWeight: 700, marginBottom: '12px',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 3, height: 16, background: 'var(--color-primary)', borderRadius: 2 }} />
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
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--color-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, flexShrink: 0,
                            fontFamily: 'var(--font-calligraphy)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{
                          fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                          fontFamily: 'var(--font-serif)',
                        }}>
                          {spot?.name || spotId}
                        </span>
                      </div>
                      {spot?.overview && (
                        <div style={{
                          fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px',
                          fontFamily: 'var(--font-serif)', lineHeight: 1.6,
                        }}>
                          {spot.overview}
                        </div>
                      )}
                      {detail?.讲解重点 && detail.讲解重点.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-serif)' }}>
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>讲解重点：</div>
                          <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                            {detail.讲解重点.map((p, j) => <li key={j}>{p}</li>)}
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
    },
    [expandedRoute, routeDetail, spotCache, handleExpandRoute, isMobile],
  );

  return (
    <div
      data-testid="recommend-page"
      className="paper-texture"
      style={{
        padding: isMobile ? '20px' : '32px',
        maxWidth: '1100px',
        margin: '0 auto',
        paddingBottom: isMobile ? '80px' : '48px',
        minHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* 标题区 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 120, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
          margin: '0 auto 16px',
        }} />
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-calligraphy)',
            letterSpacing: 3,
          }}
        >
          个性化路线推荐
        </h2>
        <p style={{
          margin: 0, color: 'var(--text-tertiary)', fontSize: '15px',
          fontFamily: 'var(--font-serif)', letterSpacing: 1,
        }}>
          选择你的兴趣，AI 为你定制专属游览路线
        </p>
        <div style={{
          width: 120, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
          margin: '12px auto 0',
        }} />
      </div>

      {/* DNA Profile Section */}
      {dnaProfile && (
        <div className="section-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              我的旅行DNA
            </h3>
            <DNATag dnaType={dnaProfile.dna_type} />
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'center' }}>
            <DNARadarChart scores={dnaProfile.dna_scores} size={isMobile ? 240 : 280} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                DNA个性化推荐
              </h4>
              {dnaRecs?.recommendations && dnaRecs.recommendations.length > 0 ? (
                <div>
                  {dnaRecs.recommendations.map((rec) => (
                    <div
                      key={rec.rank}
                      style={{
                        padding: '10px 12px',
                        marginBottom: '8px',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-elevated)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {rec.spot_name}
                        </span>
                        {rec.dna_similarity && (
                          <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>
                            相似度 {Math.round(rec.dna_similarity * 100)}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {rec.reason}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        建议时长: {rec.suggested_duration}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                  暂无DNA推荐数据
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dnaLoading && (
        <div className="section-card" style={{ marginBottom: '24px', padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          正在分析您的旅行DNA...
        </div>
      )}

      {/* Interest tags */}
      <div
        className="scroll-tags"
        data-testid="interest-tags"
        style={{
          marginBottom: '24px',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          justifyContent: 'center',
        }}
      >
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
                fontFamily: 'var(--font-serif)',
                letterSpacing: 1,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* AI Dynamic Recommendations Section */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '16px', fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
          }}
        >
          <div style={{ width: 3, height: 18, background: 'var(--color-accent)', borderRadius: 2 }} />
          <CompassOutlined style={{ color: 'var(--color-accent)' }} />
          AI 智能推荐
        </div>
        <RecommendEngine
          selectedInterest={selectedType}
          onSelectRoute={handleSelectRec}
          onRecommendations={handleRecommendations}
        />
      </div>

      {/* Push to Room button — supports both AI recs and DNA recs */}
      {(() => {
        const pushable: RecommendationResult[] = aiRecs.length > 0
          ? aiRecs
          : (dnaRecs?.recommendations || []).map((d) => ({
              route_id: d.spot_name,
              route_name: d.spot_name,
              score: d.dna_similarity || 0.8,
              reason: d.reason,
              matched_interests: d.tags,
            }));
        return roomId && pushable.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <RoutePushButton
              roomId={roomId}
              recommendations={pushable}
              onPushComplete={(count) => {
                message.success(`成功推送 ${count} 个推荐到房间`);
              }}
            />
          </div>
        ) : null;
      })()}

      {/* Static Route List */}
      <div>
        <div
          style={{
            fontSize: '16px', fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
          }}
        >
          <div style={{ width: 3, height: 18, background: 'var(--color-primary)', borderRadius: 2 }} />
          <CompassOutlined style={{ color: 'var(--color-primary)' }} />
          预设路线
        </div>
        <div
          data-testid="route-list"
          style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 200ms' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-serif)' }}>
              墨韵渐染...
            </div>
          ) : routes.length > 0 ? (
            routes.map((route, index) => renderRouteCard(route, index))
          ) : (
            <div
              data-testid="empty-state"
              className="animate-fade-in"
              style={{
                textAlign: 'center', padding: '60px 20px',
                color: 'var(--text-tertiary)', backgroundColor: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)',
              }}
            >
              <CompassOutlined style={{ fontSize: '40px', marginBottom: '12px', color: 'var(--gray-300)' }} />
              <div style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-serif)' }}>
                暂无匹配的推荐路线
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendPage;
