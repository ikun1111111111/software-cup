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
      <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            border: '2px solid var(--gray-200)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: 2 }}>墨韵渐染...</p>
        </div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 24px',
            border: '2px solid var(--gray-200)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-calligraphy)', fontSize: 32, color: 'var(--gray-300)',
          }}>
            寻
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 16, fontFamily: 'var(--font-serif)', marginBottom: 24 }}>
            景点未找到
          </p>
          <button onClick={() => navigate('/explore')} className="btn-seal btn-seal--filled">
            返回景点列表
          </button>
        </div>
      </div>
    );
  }

  const isCore = spot.category === '核心景点';

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
            fontFamily: 'var(--font-serif)',
          }}
        >
          <ArrowLeftOutlined /> 返回
        </button>

        {/* Hero card - 水墨遮罩 */}
        <div className="section-card" style={{ overflow: 'hidden', padding: 0, marginBottom: 24, position: 'relative' }}>
          {/* 顶部渐变条 */}
          <div style={{
            height: 6,
            background: isCore
              ? 'linear-gradient(90deg, #C8A951, #D4B876, #E8CF7A)'
              : 'linear-gradient(90deg, #6A9C89, #8CBFAD, #A8D4C4)',
          }} />

          {/* 水墨遮罩背景 */}
          <div style={{
            position: 'absolute',
            top: 6, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(180deg, rgba(106,156,137,0.04) 0%, transparent 30%, rgba(247,245,240,0) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />

          <div style={{ padding: '32px 36px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {/* 竖线装饰 + 标题 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 3, height: 60,
                    background: isCore
                      ? 'linear-gradient(to bottom, #C8A951, #D4B876, transparent)'
                      : 'linear-gradient(to bottom, #6A9C89, #8CBFAD, transparent)',
                    borderRadius: 2,
                    flexShrink: 0,
                    marginTop: 8,
                  }} />
                  <div style={{ flex: 1 }}>
                    <h1 style={{
                      margin: '0 0 10px',
                      fontSize: 'var(--font-size-h1)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-calligraphy)',
                      letterSpacing: 2,
                      lineHeight: 1.3,
                    }}>
                      {spot.name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="badge-seal" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-seal)',
                        background: isCore ? 'rgba(200,169,81,0.1)' : 'rgba(106,156,137,0.1)',
                        color: isCore ? '#9E8A3A' : 'var(--color-primary)',
                        border: isCore ? '1px solid rgba(200,169,81,0.2)' : '1px solid rgba(106,156,137,0.2)',
                      }}>
                        {spot.category}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-serif)',
                      }}>
                        <EnvironmentOutlined /> 灵山胜境
                      </span>
                    </div>
                  </div>
                </div>

                {/* 概述 - 古籍引言风格 */}
                <div style={{
                  marginTop: 20,
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #FDFBF7 0%, #F7F5F0 100%)',
                  borderLeft: '3px solid ' + (isCore ? '#C8A951' : 'var(--color-primary)'),
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  position: 'relative',
                }}>
                  <p style={{
                    fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.9,
                    margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  }}>
                    {spot.overview}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 角落装饰 */}
          <div className="corner-deco corner-deco--tl" style={{ borderColor: isCore ? 'rgba(200,169,81,0.15)' : 'rgba(106,156,137,0.15)' }} />
          <div className="corner-deco corner-deco--tr" style={{ borderColor: isCore ? 'rgba(200,169,81,0.15)' : 'rgba(106,156,137,0.15)' }} />
        </div>

        {/* Tags - 印章式标签 */}
        {spot.tags && spot.tags.length > 0 && (
          <div className="section-card" style={{ padding: '20px 24px', marginBottom: 24, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TagOutlined style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
                景点标签
              </span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--gray-200), transparent)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {spot.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 13, padding: '5px 14px', borderRadius: 4,
                  background: 'rgba(106,156,137,0.06)',
                  color: 'var(--color-primary-dark)', fontWeight: 500,
                  fontFamily: 'var(--font-serif)',
                  border: '1px solid rgba(106,156,137,0.12)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Detail content - 古籍排版 */}
        <div className="section-card" style={{ padding: '28px 32px', marginBottom: 24, position: 'relative' }}>
          {/* 古籍标题栏 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
          }}>
            <div style={{
              width: 4, height: 20, background: 'var(--color-primary)', borderRadius: 2,
            }} />
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
              margin: 0, fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
            }}>
              详细介绍
            </h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--gray-200), transparent)' }} />
          </div>

          {/* 古籍内容 */}
          <div style={{
            fontSize: 15, color: 'var(--text-secondary)', lineHeight: 2.2,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-serif)',
            textAlign: 'justify',
            textIndent: '2em',
          }}>
            {spot.detail || spot.overview || '暂无详细介绍，敬请期待。'}
          </div>

          {/* 底部印章装饰 */}
          <div style={{
            position: 'absolute', bottom: 16, right: 24,
            width: 40, height: 40,
            border: '2px solid rgba(200,75,49,0.15)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(200,75,49,0.2)',
            fontFamily: 'var(--font-calligraphy)',
            fontSize: 18,
            transform: 'rotate(-8deg)',
            pointerEvents: 'none',
          }}>
            胜境
          </div>
        </div>

        {/* Related spots */}
        {spot.related_spots && spot.related_spots.length > 0 && (
          <div className="section-card" style={{ padding: '24px 28px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 4, height: 20, background: 'var(--color-gold)', borderRadius: 2,
              }} />
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                margin: 0, fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
              }}>
                周边景点
              </h2>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--gray-200), transparent)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {spot.related_spots.map((relId) => (
                <button
                  key={relId}
                  onClick={() => navigate(`/attractions/${relId}`)}
                  className="btn-tag"
                  style={{
                    padding: '8px 18px',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {relId.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons - 东方风格 */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/', { state: { fromQR: true, spotId: spot.id, spotName: spot.name } })}
            className="btn-seal btn-seal--filled"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', fontSize: 15, fontWeight: 600,
            }}
          >
            <MessageOutlined /> 问数字人导游
          </button>
          <button
            onClick={() => navigate('/', { state: { fromQR: true, spotId: spot.id, spotName: spot.name } })}
            className="btn-seal btn-seal--filled"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', fontSize: 15, fontWeight: 600,
            }}
          >
            <SoundOutlined /> 听故事讲解
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttractionDetail;
