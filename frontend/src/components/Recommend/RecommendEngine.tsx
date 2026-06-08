import React, { useEffect, useState, useCallback } from 'react';
import { Spin, Tag } from 'antd';
import {
  CompassOutlined,
  BulbOutlined,
  StarFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  getRecommendations,
  type RecommendationResult,
} from '../../api/routes';

interface RecommendEngineProps {
  selectedInterest?: string;
  onSelectRoute?: (route: RecommendationResult) => void;
  onRecommendations?: (recs: RecommendationResult[]) => void;
}

/**
 * Dynamic AI recommendation engine.
 * Displays personalized route recommendations based on user interests.
 */
const RecommendEngine: React.FC<RecommendEngineProps> = ({
  selectedInterest,
  onSelectRoute,
  onRecommendations,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string>('新游客');

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const interests = selectedInterest ? [selectedInterest] : undefined;
      const result = await getRecommendations({ interests });
      // Backend returns { recommendations: [...], strategy, cached }
      const data = (result as any)?.data ?? result;
      const recs = Array.isArray(data) ? data : (data?.recommendations || []);
      if (Array.isArray(recs)) {
        // Map backend RecommendItem to frontend RecommendationResult
        const mapped: RecommendationResult[] = recs.map((r: any, i: number) => ({
          route_id: r.spot_name || r.route_id || `rec-${i}`,
          route_name: r.spot_name || r.route_name || '推荐景点',
          score: r.score ?? (r.rank ? 1 - r.rank * 0.1 : 0.7),
          reason: r.reason || 'AI 推荐',
          matched_interests: r.tags || r.matched_interests || [],
        }));
        setRecommendations(mapped);
        onRecommendations?.(mapped);
      }
      // Determine user type based on interest
      if (!selectedInterest) {
        setUserType('新游客');
      } else if (selectedInterest === 'history') {
        setUserType('历史文化爱好者');
      } else if (selectedInterest === 'nature') {
        setUserType('自然风光探索者');
      } else if (selectedInterest === 'family') {
        setUserType('亲子出行');
      } else {
        setUserType('新游客');
      }
    } catch {
      setError('推荐服务暂时不可用');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedInterest]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--text-tertiary)',
        }}
      >
        <Spin size="default" />
        <div style={{ marginTop: '12px', fontSize: '14px' }}>
          AI 正在为你推荐最佳路线...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '24px 20px',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
        }}
      >
        <CompassOutlined style={{ fontSize: '28px', marginBottom: '8px', color: 'var(--gray-300)' }} />
        <div>{error}</div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '24px 20px',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <BulbOutlined style={{ fontSize: '28px', marginBottom: '8px', color: 'var(--gray-300)' }} />
        <div>选择兴趣标签获取个性化路线推荐</div>
      </div>
    );
  }

  return (
    <div data-testid="recommend-engine">
      {/* User type tag */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ThunderboltOutlined style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          AI 识别你为
        </span>
        <Tag
          color="orange"
          style={{ margin: 0, fontSize: '12px', borderRadius: 'var(--radius-pill)' }}
        >
          {userType}
        </Tag>
      </div>

      {/* Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recommendations.map((rec, i) => (
          <div
            key={rec.route_id}
            data-testid={`recommendation-${rec.route_id}`}
            className="card-hover"
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              cursor: onSelectRoute ? 'pointer' : 'default',
              animation: `fadeInUp 250ms ease-out ${i * 80}ms both`,
            }}
            onClick={() => onSelectRoute?.(rec)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CompassOutlined style={{ color: 'var(--color-primary)' }} />
                  {rec.route_name}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: '8px',
                  }}
                >
                  <BulbOutlined style={{ marginRight: '6px', color: 'var(--color-accent)' }} />
                  {rec.reason}
                </div>
                {rec.matched_interests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {rec.matched_interests.map((tag) => (
                      <Tag
                        key={tag}
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          border: '1px solid var(--color-primary)',
                          color: 'var(--color-primary)',
                          background: 'var(--color-primary-bg)',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* Score badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background:
                      rec.score >= 0.8
                        ? 'linear-gradient(135deg, #C84B31, #E85D3A)'
                        : rec.score >= 0.6
                        ? 'linear-gradient(135deg, #C8882E, #E8A838)'
                        : 'linear-gradient(135deg, #1A5FB4, #3584E4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <StarFilled style={{ fontSize: '14px' }} />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color:
                      rec.score >= 0.8
                        ? '#C84B31'
                        : rec.score >= 0.6
                        ? '#C8882E'
                        : 'var(--color-primary)',
                  }}
                >
                  {Math.round(rec.score * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RecommendEngine;
