import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined, EnvironmentOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { getSpotById, type SpotDetail } from '../../api/spots';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/* ================================================================
   景点图片映射 — spotId → 图片路径
   缺图的景点可在此处添加
   ================================================================ */

const SPOT_IMAGES: Record<string, string[]> = {
  // 灵山胜境景点 — 使用 slug ID 匹配 API 返回的 spot.id
  'ling-shan-da-fo':       ['/image/bigfo.png'],
  'fan-gong':              ['/image/fangong.png'],
  'jiu-long-guan-yu':      ['/image/nine dragon.png'],
  'wu-yin-tan-cheng':      ['/image/wuyin.png'],
  'xiang-fu-chan-si':       ['/image/xiangfu.png'],
  'fo-shou-guang-chang':   ['/image/foshou.png'],
  'bai-zi-xi-mi-le':       ['/image/baizi.png'],
  'man-fei-long-ta':       ['/image/manfeilong.png'],
  'ling-shan-jing-she':    ['/image/jingshe.png'],
  'ling-shan-da-zhao-bi':  ['/image/zhaobi.png'],
  'pu-ti-da-dao':          ['/image/puti.png'],
  'san-sheng-dian':        ['/image/sansheng.png'],
};

const getSpotImages = (spotId: string): string[] => SPOT_IMAGES[spotId] || [];

/* ================================================================
   主组件 — 杂志风图文混排
   ================================================================ */

const AttractionDetail: React.FC = () => {
  const { spotId } = useParams<{ spotId: string }>();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

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
          }}>寻</div>
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

  const images = getSpotImages(spot.id);
  const hasImages = images.length > 0;
  const isCore = spot.category === '核心景点';
  const accentColor = isCore ? '#C8A951' : '#6A9C89';

  // 将详情文本按句号/感叹号分割成自然段落
  const detailText = spot.detail || spot.overview || '';
  const paragraphs = detailText.split(/[。！？]{1,2}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .map((s, i, arr) => i < arr.length - 1 ? s + '。' : s);

  // 图片插入计划 — 在正文的不同位置交错插入
  // 每张图有不同的偏移、宽度、旋转角度，营造杂志编辑感
  interface ImgPlan {
    afterParagraph: number;  // 在第几段后插入
    side: 'left' | 'right'; // 浮动方向
    width: string;          // 宽度
    rotate: number;         // 旋转角度
    offsetY: number;        // 垂直偏移
    caption: string;        // 图片说明
  }

  const imgPlans: ImgPlan[] = [];
  if (hasImages && paragraphs.length >= 2) {
    // 只插入一张图：在约1/3处，右侧浮动，微倾斜
    imgPlans.push({
      afterParagraph: Math.max(0, Math.floor(paragraphs.length * 0.35) - 1),
      side: 'right',
      width: '45%',
      rotate: 1.2,
      offsetY: 4,
      caption: spot.name,
    });
  }

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 48 }}>

      {/* ═══ Hero 区域 — 大图背景 ═══ */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        height: isMobile ? 320 : 400,
        overflow: 'hidden',
      }}>
        {/* 背景大图 — 全宽铺满 */}
        {hasImages && (
          <img
            src={images[0]}
            alt={spot.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              zIndex: 0,
            }}
          />
        )}
        {/* 暗色遮罩 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.1) 100%)',
          zIndex: 1,
        }} />
        {/* 内容层 */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: isMobile ? '40px 16px 28px' : '60px 24px 40px',
        }}>
          <button
            onClick={() => navigate('/explore')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.35)', border: 'none',
              color: '#fff',
              fontSize: 14, cursor: 'pointer', marginBottom: 20,
              padding: '6px 14px', borderRadius: 20,
              fontFamily: 'var(--font-serif)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ArrowLeftOutlined /> 返回
          </button>
          <h1 style={{
            margin: '0 0 12px',
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
            letterSpacing: 5,
            lineHeight: 1.3,
          }}>
            {spot.name}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 13, padding: '4px 12px', borderRadius: 4,
              background: 'rgba(255,255,255,0.18)',
              color: '#fff', fontWeight: 600,
              fontFamily: 'var(--font-serif)', letterSpacing: 1,
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(4px)',
            }}>
              {spot.category}
            </span>
            <span style={{
              fontSize: 13, color: 'rgba(255,255,255,0.85)',
              fontFamily: 'var(--font-serif)',
            }}>
              <EnvironmentOutlined /> 灵山胜境
            </span>
          </div>
        </div>
      </div>

      {/* ═══ 内容主体 — 杂志编辑式排版 ═══ */}
      <div style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: '0 28px',
      }}>

        {/* 概述引言 — 浮于Hero底部或独立 */}
        {spot.overview && (
          <div style={{
            position: 'relative',
            marginTop: 24,
            marginBottom: 28,
            padding: '22px 28px',
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: `4px solid ${accentColor}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            zIndex: 5,
          }}>
            <p style={{
              fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.9,
              margin: 0, fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
            }}>
              {spot.overview}
            </p>
          </div>
        )}

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32,
          }}>
            {spot.tags.map((tag) => (
              <span key={tag} style={{
                fontSize: 13, padding: '5px 14px', borderRadius: 4,
                background: `${accentColor}08`,
                color: isCore ? '#9E8A3A' : 'var(--color-primary-dark)',
                fontWeight: 500, fontFamily: 'var(--font-serif)',
                border: `1px solid ${accentColor}18`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ═══ 详细介绍 — 杂志风图文混排 ═══ */}
        <div style={{ marginBottom: 36 }}>
          {/* 小标题 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          }}>
            <div style={{
              width: 4, height: 22, background: accentColor, borderRadius: 2,
            }} />
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: 'var(--text-primary)',
              margin: 0, fontFamily: 'var(--font-calligraphy)', letterSpacing: 2,
            }}>
              详细介绍
            </h2>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accentColor}30, transparent)` }} />
          </div>

          {/* 段落 + 图片交错混排 */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {paragraphs.map((para, idx) => {
              // 查找是否有图片要在此段落后插入
              const planForThis = imgPlans.find((p) => p.afterParagraph === idx);

              return (
                <React.Fragment key={idx}>
                  <p style={{
                    fontSize: isMobile ? 15 : 16,
                    color: 'var(--text-secondary)',
                    lineHeight: isMobile ? 1.8 : 2.1,
                    fontFamily: 'var(--font-serif)',
                    textAlign: 'justify',
                    textIndent: isMobile ? '1.5em' : '2em',
                    marginBottom: '1.3em',
                  }}>
                    {para}
                  </p>

                  {/* 插入图片 — 交错杂志风 */}
                  {planForThis && (
                    <div style={{
                      float: isMobile ? 'none' : planForThis.side,
                      width: isMobile ? '100%' : planForThis.width,
                      margin: isMobile ? '0 0 20px' : (planForThis.side === 'right'
                        ? `${planForThis.offsetY}px -20px 24px 28px`
                        : `${planForThis.offsetY}px 28px 24px -20px`),
                      clear: 'both',
                    }}>
                      <div style={{
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
                        border: `1px solid ${accentColor}18`,
                        transform: isMobile ? 'none' : `rotate(${planForThis.rotate}deg)`,
                        transition: 'transform 400ms ease',
                      }}>
                        <img
                          src={images[0]}
                          alt={planForThis.caption}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: isMobile ? 200 : (planForThis.width === '48%' ? 240 : planForThis.width === '40%' ? 200 : 180),
                            objectFit: 'cover',
                            objectPosition: planForThis.side === 'right' ? 'center 40%' : 'center 60%',
                            display: 'block',
                            transform: isMobile ? 'none' : `rotate(${-planForThis.rotate}deg) scale(1.05)`,
                          }}
                        />
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--text-tertiary)',
                        textAlign: 'center', marginTop: 8,
                        fontFamily: 'var(--font-serif)',
                        letterSpacing: 1,
                        transform: `rotate(${planForThis.rotate * 0.3}deg)`,
                      }}>
                        <CameraOutlined style={{ marginRight: 4 }} />
                        {planForThis.caption}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* 清除浮动 */}
            <div style={{ clear: 'both' }} />
          </div>

          {/* 底部印章装饰 */}
          <div style={{
            float: 'right', marginRight: -8, marginTop: -20,
            width: 48, height: 48,
            border: `2px solid ${accentColor}25`,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: `${accentColor}30`,
            fontFamily: 'var(--font-calligraphy)',
            fontSize: 20,
            transform: 'rotate(-8deg)',
            pointerEvents: 'none',
          }}>
            胜境
          </div>
          <div style={{ clear: 'both' }} />
        </div>

        {/* ═══ 周边景点 ═══ */}
        {spot.related_spots && spot.related_spots.length > 0 && (
          <div className="section-card" style={{ padding: '24px 28px', marginBottom: 28 }}>
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

      </div>

    </div>
  );
};

export default AttractionDetail;
