import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined, EnvironmentOutlined, TagOutlined,
  MessageOutlined, SoundOutlined, CameraOutlined,
} from '@ant-design/icons';
import { getSpotById, type SpotDetail } from '../../api/spots';

/* ================================================================
   景点图片映射 — spotId → 图片路径
   缺图的景点可在此处添加
   ================================================================ */

const SPOT_IMAGES: Record<string, string[]> = {
  // 灵山胜境景点 — 数据库ID (LS-xxx) 映射
  'LS-006': ['/image/nine dragon.png'],  // 九龙灌浴
  'LS-007': ['/image/foshou.png'],       // 降魔浮雕 / 佛手广场
  'LS-008': ['/image/foshou.png'],       // 阿育王柱 / 佛手广场
  'LS-009': ['/image/baizi.png'],        // 百子戏弥勒
  'LS-010': ['/image/xiangfu.png'],      // 祥符禅寺
  'LS-011': ['/image/bigfo.png'],        // 灵山大佛
  'LS-012': ['/image/sansheng.png'],     // 三圣殿
  'LS-013': ['/image/fangong.png'],      // 梵宫
  'LS-014': ['/image/wuyin.png'],        // 五印坛城
  'LS-015': ['/image/manfeilong.png'],   // 曼飞龙塔
  'LS-004': ['/image/jingshe.png'],      // 五门 / 灵山精舍
  'LS-005': ['/image/puti.png'],         // 菩提大道
  // 以下景点暂无图片
  // 'LS-001': [],  // 灵山大照壁
  // 'LS-002': [],  // 五门
  // 'LS-003': [],  // 佛足印
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

      {/* ═══ Hero 区域 — 纯文字大气风格 ═══ */}
      <div style={{
        padding: '60px 24px 40px',
        background: `linear-gradient(180deg, ${accentColor}12 0%, #F7F5F0 100%)`,
        textAlign: 'center', marginBottom: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--color-primary)',
            fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: '6px 0',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <ArrowLeftOutlined /> 返回
        </button>
        <h1 style={{
          margin: '0 0 12px',
          fontSize: 'clamp(30px, 5vw, 46px)',
          fontWeight: 800,
          color: 'var(--text-primary)',
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
            background: `${accentColor}15`,
            color: accentColor, fontWeight: 600,
            fontFamily: 'var(--font-serif)', letterSpacing: 1,
            border: `1px solid ${accentColor}20`,
          }}>
            {spot.category}
          </span>
          <span style={{
            fontSize: 13, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-serif)',
          }}>
            <EnvironmentOutlined /> 灵山胜境
          </span>
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
                    fontSize: 16,
                    color: 'var(--text-secondary)',
                    lineHeight: 2.1,
                    fontFamily: 'var(--font-serif)',
                    textAlign: 'justify',
                    textIndent: '2em',
                    marginBottom: '1.3em',
                  }}>
                    {para}
                  </p>

                  {/* 插入图片 — 交错杂志风 */}
                  {planForThis && (
                    <div style={{
                      float: planForThis.side,
                      width: planForThis.width,
                      margin: planForThis.side === 'right'
                        ? `${planForThis.offsetY}px -20px 24px 28px`
                        : `${planForThis.offsetY}px 28px 24px -20px`,
                      clear: 'both',
                    }}>
                      <div style={{
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
                        border: `1px solid ${accentColor}18`,
                        transform: `rotate(${planForThis.rotate}deg)`,
                        transition: 'transform 400ms ease',
                      }}>
                        <img
                          src={images[0]}
                          alt={planForThis.caption}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: planForThis.width === '48%' ? 240 : planForThis.width === '40%' ? 200 : 180,
                            objectFit: 'cover',
                            objectPosition: planForThis.side === 'right' ? 'center 40%' : 'center 60%',
                            display: 'block',
                            transform: `rotate(${-planForThis.rotate}deg) scale(1.05)`,
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

        {/* ═══ 操作按钮 ═══ */}
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
