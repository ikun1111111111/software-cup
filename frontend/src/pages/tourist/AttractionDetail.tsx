import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined, EnvironmentOutlined, TagOutlined,
  MessageOutlined, SoundOutlined,
} from '@ant-design/icons';
import { getSpotById, type SpotDetail } from '../../api/spots';

const AttractionDetail: React.FC = () => {
  const { spotId } = useParams<{ spotId: string }>();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!spotId) return;
    setLoading(true);
    getSpotById(spotId)
      .then((res) => {
        setSpot((res as any).data ?? res);
      })
      .catch(() => setSpot(null))
      .finally(() => setLoading(false));
  }, [spotId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-tertiary)' }}>
        加载中...
      </div>
    );
  }

  if (!spot) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 16 }}>景点未找到</p>
        <button onClick={() => navigate('/explore')} style={{
          padding: '10px 24px', background: 'var(--color-primary)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
        }}>
          返回景点列表
        </button>
      </div>
    );
  }

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px' }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--color-primary)',
            fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: '6px 0',
          }}
        >
          <ArrowLeftOutlined /> 返回
        </button>

        {/* Hero card */}
        <div className="section-card" style={{ overflow: 'hidden', padding: 0, marginBottom: 20 }}>
          <div style={{
            height: 6,
            background: spot.category === '核心景点'
              ? 'linear-gradient(90deg, #C8882E, #E8A838, #F59E0B)'
              : 'linear-gradient(90deg, #2D8B57, #4ADE80, #34D399)',
          }} />
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                  <EnvironmentOutlined style={{ marginRight: 10, color: 'var(--color-primary)' }} />
                  {spot.name}
                </h1>
                <span style={{
                  display: 'inline-block', fontSize: 13, padding: '3px 12px', borderRadius: 12,
                  background: spot.category === '核心景点' ? 'rgba(200,136,46,0.12)' : 'rgba(45,139,87,0.12)',
                  color: spot.category === '核心景点' ? '#B45309' : '#166534', fontWeight: 500,
                }}>
                  {spot.category}
                </span>
              </div>
            </div>

            <p style={{
              fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.8,
              margin: '16px 0 0', fontStyle: 'italic',
            }}>
              {spot.overview}
            </p>
          </div>
        </div>

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <div className="section-card" style={{ padding: '18px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TagOutlined style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>景点标签</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {spot.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 13, padding: '5px 14px', borderRadius: 16,
                  background: 'rgba(26,95,180,0.08)',
                  color: 'var(--color-primary)', fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Detail content */}
        <div className="section-card" style={{ padding: '24px 32px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            详细介绍
          </h2>
          <div style={{
            fontSize: 15, color: 'var(--text-secondary)', lineHeight: 2,
            whiteSpace: 'pre-wrap',
          }}>
            {spot.detail}
          </div>
        </div>

        {/* Related spots */}
        {spot.related_spots && spot.related_spots.length > 0 && (
          <div className="section-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px' }}>
              周边景点
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {spot.related_spots.map((relId) => (
                <button
                  key={relId}
                  onClick={() => navigate(`/attractions/${relId}`)}
                  style={{
                    padding: '8px 18px', borderRadius: 20,
                    border: '1px solid var(--border-light)',
                    background: 'rgba(255,255,255,0.6)',
                    color: 'var(--text-secondary)', fontSize: 14,
                    cursor: 'pointer', transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-bg)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                    e.currentTarget.style.borderColor = 'rgba(26,95,180,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}
                >
                  {relId.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          <button
            onClick={() => navigate('/', { state: { fromQR: true, spotId: spot.id, spotName: spot.name } })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 24,
              background: 'linear-gradient(135deg, #1A5FB4, #3584E4)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,95,180,0.25)',
              transition: 'transform 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <MessageOutlined /> 问数字人导游
          </button>
          <button
            onClick={() => navigate('/', { state: { fromQR: true, spotId: spot.id, spotName: spot.name } })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 24,
              background: 'linear-gradient(135deg, #C8882E, #E8A838)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(200,136,46,0.25)',
              transition: 'transform 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <SoundOutlined /> 听故事讲解
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttractionDetail;
