import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  HistoryOutlined,
  TrophyOutlined,
  DownOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { RevealOnScroll } from '../../components/ui';

/* ================================================================
   首页 — 东方美学入口页（增强版）
   ================================================================ */

interface FeatureCard {
  to: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const FEATURES: FeatureCard[] = [
  {
    to: '/chat',
    label: '对话导览',
    desc: '与AI数字人对话，获取智能导览',
    icon: <MessageOutlined />,
    color: '#6A9C89',
    bg: '#E8F2EE',
  },
  {
    to: '/attractions',
    label: '景点探索',
    desc: '浏览灵山胜境所有景点',
    icon: <EnvironmentOutlined />,
    color: '#C84B31',
    bg: '#FCECE9',
  },
  {
    to: '/recommend',
    label: '路线推荐',
    desc: '个性化游玩路线推荐',
    icon: <CompassOutlined />,
    color: '#2A4D6E',
    bg: '#E8EEF4',
  },
  {
    to: '/history',
    label: '时空穿越',
    desc: '穿越千年，与历史对话',
    icon: <HistoryOutlined />,
    color: '#6BA292',
    bg: '#E8F2EE',
  },
  {
    to: '/leaderboard',
    label: '排行榜',
    desc: '热门景点与游客榜单',
    icon: <TrophyOutlined />,
    color: '#C8A951',
    bg: '#FDF6E3',
  },
];

const SPOTS = [
  { name: '灵山大佛', desc: '世界第一高青铜立佛', img: '/image/AigcAssets3.png', tag: '必游' },
  { name: '九龙灌浴', desc: '佛教文化主题表演', img: '/image/bg-mountain.png', tag: '热门' },
  { name: '梵宫', desc: '佛教艺术殿堂', img: '/image/bg-mountain-clean.png', tag: '推荐' },
];

/* ── 水墨分割线组件 ── */
const InkDivider: React.FC<{ text?: string }> = ({ text }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    margin: '0 auto',
    maxWidth: 300,
    padding: '8px 0',
  }}>
    <div style={{
      flex: 1,
      height: 1,
      background: 'linear-gradient(to right, transparent, #C0BBB6)',
    }} />
    {text && (
      <span style={{
        fontSize: 11,
        color: '#9E988E',
        letterSpacing: 4,
        fontFamily: "'Noto Serif SC', serif",
      }}>
        {text}
      </span>
    )}
    {!text && (
      <div style={{
        width: 6,
        height: 6,
        background: '#C84B31',
        borderRadius: 1,
        transform: 'rotate(45deg)',
        opacity: 0.5,
      }} />
    )}
    <div style={{
      flex: 1,
      height: 1,
      background: 'linear-gradient(to left, transparent, #C0BBB6)',
    }} />
  </div>
);

/* ── 东方标题组件 ── */
const OrientalTitle: React.FC<{
  title: string;
  subtitle?: string;
  center?: boolean;
  size?: 'lg' | 'md';
}> = ({ title, subtitle, center, size = 'lg' }) => (
  <div style={{ textAlign: center ? 'center' : 'left', marginBottom: 48 }}>
    <h2 style={{
      fontSize: size === 'lg' ? 'clamp(26px, 4vw, 34px)' : 'clamp(20px, 3vw, 26px)',
      fontWeight: 700,
      color: '#2A2520',
      fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
      letterSpacing: '0.12em',
      marginBottom: subtitle ? 12 : 0,
      position: 'relative',
      display: 'inline-block',
    }}>
      {title}
      {/* 笔触装饰线 */}
      <span style={{
        position: 'absolute',
        bottom: -6,
        left: center ? '15%' : 0,
        width: center ? '70%' : '100%',
        height: 3,
        background: 'linear-gradient(to right, transparent 0%, #C84B31 20%, #C84B31 80%, transparent 100%)',
        borderRadius: 2,
        opacity: 0.6,
      }} />
    </h2>
    {subtitle && (
      <p style={{
        fontSize: 14,
        color: '#9E988E',
        letterSpacing: 6,
        marginTop: 16,
        fontFamily: "'Noto Serif SC', serif",
      }}>
        {subtitle}
      </p>
    )}
  </div>
);

/* ═══════════════════════════════════════
   Hero 区域 — 水墨山水意境
   ═══════════════════════════════════════ */
const HeroSection: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const parallaxOffset = scrollY * 0.3;

  return (
    <section style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      minHeight: 640,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
    }}>
      {/* 背景图 — 视差滚动 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/image/AigcAssets3.png)',
        backgroundSize: 'cover',
        backgroundPosition: `center ${50 + parallaxOffset * 0.1}%`,
        transform: loaded ? 'scale(1.08)' : 'scale(1.15)',
        transition: 'transform 12s cubic-bezier(0.25, 1, 0.5, 1)',
      }} />

      {/* 水墨渐变遮罩 — 多层 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 50% 40%, rgba(26,22,20,0.1) 0%, rgba(26,22,20,0.4) 70%),
          linear-gradient(180deg, rgba(26,22,20,0.4) 0%, rgba(26,22,20,0.1) 35%, rgba(26,22,20,0.05) 50%, rgba(26,22,20,0.35) 80%, rgba(26,22,20,0.6) 100%)
        `,
      }} />

      {/* 主体内容 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        padding: '0 24px',
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 1.4s cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
        {/* 印章装饰 */}
        <div style={{
          width: 52,
          height: 52,
          margin: '0 auto 20px',
          border: '2px solid rgba(200, 75, 49, 0.7)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
          fontSize: 24,
          color: 'rgba(200, 75, 49, 0.9)',
          transform: loaded ? 'rotate(-5deg) scale(1)' : 'rotate(-15deg) scale(1.5)',
          opacity: loaded ? 1 : 0,
          transition: 'all 800ms cubic-bezier(0.34, 1.56, 0.64, 1) 400ms',
          boxShadow: '0 0 0 4px rgba(200, 75, 49, 0.1)',
          position: 'relative',
        }}>
          灵
          <div style={{
            position: 'absolute',
            inset: 4,
            border: '1px solid rgba(200, 75, 49, 0.3)',
            borderRadius: 2,
          }} />
        </div>

        {/* 主标题 */}
        <h1 style={{
          fontSize: 'clamp(38px, 8vw, 72px)',
          fontWeight: 900,
          letterSpacing: '20px',
          textShadow: '0 2px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.2)',
          marginBottom: 8,
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', 'STSong', serif",
          lineHeight: 1.2,
        }}>
          灵山胜境
        </h1>

        {/* 英文副标题 */}
        <p style={{
          fontSize: 11,
          letterSpacing: 8,
          textTransform: 'uppercase',
          opacity: 0.6,
          marginBottom: 16,
          fontWeight: 300,
        }}>
          Lingshan Sacred Land
        </p>

        {/* 水墨分割线 */}
        <div style={{
          width: 180,
          height: 1,
          margin: '0 auto 20px',
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
        }} />

        {/* 诗意副标题 */}
        <p style={{
          fontSize: 'clamp(15px, 2.8vw, 20px)',
          letterSpacing: '10px',
          textShadow: '0 1px 12px rgba(0,0,0,0.4)',
          marginBottom: 48,
          fontFamily: "'Noto Serif SC', serif",
          opacity: 0.9,
          lineHeight: 1.8,
        }}>
          一步一景 · 一景一画
        </p>

        {/* 入口按钮 */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/attractions" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
            color: '#fff',
            fontSize: 17,
            fontWeight: 600,
            borderRadius: 10,
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(200,75,49,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
            letterSpacing: '0.15em',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.transform = 'translateY(-3px)';
            el.style.boxShadow = '0 8px 32px rgba(200,75,49,0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = '0 4px 20px rgba(200,75,49,0.4), inset 0 1px 0 rgba(255,255,255,0.15)';
          }}>
            开启旅程
            <ArrowRightOutlined style={{ fontSize: 14 }} />
          </Link>
          <Link to="/chat" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 36px',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 17,
            fontWeight: 500,
            borderRadius: 10,
            textDecoration: 'none',
            border: '1.5px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
            letterSpacing: '0.15em',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.borderColor = 'rgba(106,156,137,0.8)';
            el.style.background = 'rgba(106,156,137,0.15)';
            el.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.borderColor = 'rgba(255,255,255,0.4)';
            el.style.background = 'rgba(255,255,255,0.08)';
            el.style.transform = 'translateY(0)';
          }}>
            <MessageOutlined /> 与数字人对话
          </Link>
        </div>
      </div>

      {/* 向下滚动提示 */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        opacity: loaded ? 0.65 : 0,
        transition: 'opacity 1.2s ease 1s',
        animation: 'bounceDown 2.5s ease-in-out infinite',
      }}>
        <span style={{ fontSize: 11, letterSpacing: 6, fontFamily: "'Noto Serif SC', serif" }}>
          向下探索
        </span>
        <DownOutlined style={{ fontSize: 14 }} />
      </div>

      <style>{`
        @keyframes bounceDown {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }
      `}</style>
    </section>
  );
};

/* ═══════════════════════════════════════
   简介区域 — 书札排版
   ═══════════════════════════════════════ */
const IntroSection: React.FC = () => (
  <section style={{
    position: 'relative',
    padding: '100px 24px 80px',
    background: 'linear-gradient(180deg, #F7F5F0 0%, #FDFBF7 50%, #F7F5F0 100%)',
  }}>
    {/* 角落装饰 */}
    <div style={{ position: 'absolute', top: 40, left: 40, width: 24, height: 24, borderTop: '2px solid #C0BBB6', borderLeft: '2px solid #C0BBB6', opacity: 0.4 }} />
    <div style={{ position: 'absolute', top: 40, right: 40, width: 24, height: 24, borderTop: '2px solid #C0BBB6', borderRight: '2px solid #C0BBB6', opacity: 0.4 }} />
    <div style={{ position: 'absolute', bottom: 40, left: 40, width: 24, height: 24, borderBottom: '2px solid #C0BBB6', borderLeft: '2px solid #C0BBB6', opacity: 0.4 }} />
    <div style={{ position: 'absolute', bottom: 40, right: 40, width: 24, height: 24, borderBottom: '2px solid #C0BBB6', borderRight: '2px solid #C0BBB6', opacity: 0.4 }} />

    <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
      <OrientalTitle title="关于灵山" subtitle="ABOUT LINGSHAN" center />

      {/* 左侧装饰线 */}
      <div style={{
        position: 'absolute',
        left: -28,
        top: 100,
        bottom: 20,
        width: 2,
        background: 'linear-gradient(to bottom, transparent, #6A9C89 20%, #6A9C89 80%, transparent)',
        opacity: 0.3,
      }} />

      <p style={{
        fontSize: 17,
        lineHeight: 2.1,
        color: '#5C554C',
        textAlign: 'justify',
        textIndent: '2em',
        marginBottom: '1.5em',
        fontFamily: "'Noto Serif SC', serif",
        letterSpacing: '0.05em',
      }}>
        灵山胜境，坐落于太湖之滨，是中国著名的佛教文化圣地。这里不仅有高达88米的灵山大佛，
        还有九龙灌浴、梵宫、五印坛城等众多景点，每一处都蕴含着深厚的佛教文化底蕴。
      </p>
      <p style={{
        fontSize: 17,
        lineHeight: 2.1,
        color: '#5C554C',
        textAlign: 'justify',
        textIndent: '2em',
        fontFamily: "'Noto Serif SC', serif",
        letterSpacing: '0.05em',
      }}>
        走进灵山，仿佛步入一幅流动的山水画卷。晨钟暮鼓，梵音缭绕，
        让心灵在这片净土中找到归宿。无论是虔诚的朝圣者，还是慕名而来的游客，
        都能在这里感受到佛法的智慧与慈悲。
      </p>

      <InkDivider text="山水禅意" />
    </div>
  </section>
);

/* ═══════════════════════════════════════
   功能入口 — 增强版卡片
   ═══════════════════════════════════════ */
const FeatureSection: React.FC = () => (
  <section style={{
    padding: '80px 24px 96px',
    background: '#F7F5F0',
    position: 'relative',
  }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <OrientalTitle title="探索灵山" subtitle="EXPLORE" center />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 24,
        maxWidth: 960,
        margin: '0 auto',
      }}>
        {FEATURES.map((f, i) => (
          <Link
            key={f.to}
            to={f.to}
            className="feature-card"
            style={{
              ['--card-accent' as string]: f.color,
              animationDelay: `${i * 80}ms`,
            }}
          >
            {/* 角落装饰 */}
            <div style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 14,
              height: 14,
              borderTop: `1.5px solid ${f.color}`,
              borderRight: `1.5px solid ${f.color}`,
              opacity: 0,
              transition: 'opacity 300ms ease',
              borderRadius: '0 4px 0 0',
            }} className="feature-card-corner" />

            <div className="feature-card__icon" style={{
              background: f.bg,
              color: f.color,
            }}>
              {f.icon}
            </div>
            <span style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
              letterSpacing: '0.08em',
            }}>
              {f.label}
            </span>
            <span style={{
              fontSize: 13,
              color: '#7A7268',
              textAlign: 'center',
              lineHeight: 1.6,
            }}>
              {f.desc}
            </span>

            {/* 底部箭头指示 */}
            <div style={{
              marginTop: 8,
              fontSize: 12,
              color: f.color,
              opacity: 0,
              transform: 'translateX(-4px)',
              transition: 'all 300ms ease',
            }} className="feature-card-arrow">
              <ArrowRightOutlined /> 进入
            </div>
          </Link>
        ))}
      </div>
    </div>

    <style>{`
      .feature-card:hover .feature-card-corner { opacity: 0.6 !important; }
      .feature-card:hover .feature-card-arrow { opacity: 0.8 !important; transform: translateX(0) !important; }
    `}</style>
  </section>
);

/* ═══════════════════════════════════════
   精选景点 — 画卷卡片增强
   ═══════════════════════════════════════ */
const FeaturedSpots: React.FC = () => (
  <section style={{
    padding: '80px 24px 96px',
    background: 'linear-gradient(180deg, #FDFBF7 0%, #F7F5F0 100%)',
  }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 40,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <OrientalTitle title="精选景点" subtitle="FEATURED SPOTS" size="md" />
        <Link to="/attractions" style={{
          fontSize: 14,
          color: '#6A9C89',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 500,
          padding: '6px 16px',
          borderRadius: 20,
          border: '1px solid rgba(106,156,137,0.3)',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(106,156,137,0.08)';
          e.currentTarget.style.borderColor = '#6A9C89';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(106,156,137,0.3)';
        }}>
          查看全部 <ArrowRightOutlined style={{ fontSize: 12 }} />
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 28,
      }}>
        {SPOTS.map((spot, i) => (
          <Link
            key={spot.name}
            to="/attractions"
            className="scroll-card"
            style={{ borderRadius: 20 }}
          >
            <div style={{
              position: 'relative',
              aspectRatio: '16/10',
              overflow: 'hidden',
            }}>
              <img
                src={spot.img}
                alt={spot.name}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* 水墨渐变遮罩 */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '55%',
                background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
              }} />
              {/* 印章式标签 */}
              <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: '4px 12px',
                background: 'rgba(200, 75, 49, 0.85)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 3,
                fontFamily: "'Noto Serif SC', serif",
                letterSpacing: 2,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(200,75,49,0.3)',
              }}>
                {spot.tag}
              </div>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
                fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
                letterSpacing: '0.08em',
              }}>
                {spot.name}
              </h3>
              <p style={{ fontSize: 14, color: '#7A7268', lineHeight: 1.6 }}>{spot.desc}</p>
              <div style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: '#6A9C89',
                fontWeight: 500,
              }}>
                了解更多 <ArrowRightOutlined style={{ fontSize: 11 }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════
   数字人展示 — 水墨画框增强
   ═══════════════════════════════════════ */
const DigitalHumanSection: React.FC = () => (
  <section style={{
    padding: '96px 24px',
    background: 'linear-gradient(180deg, #F7F5F0 0%, #FDFBF7 50%, #F7F5F0 100%)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* 背景装饰 — 淡墨远山 */}
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 200,
      opacity: 0.04,
      background: 'linear-gradient(to top, #2A2520, transparent)',
      clipPath: 'polygon(0% 100%, 5% 65%, 15% 80%, 25% 50%, 35% 70%, 45% 40%, 55% 60%, 65% 35%, 75% 55%, 85% 45%, 95% 65%, 100% 50%, 100% 100%)',
      pointerEvents: 'none',
    }} />

    <div style={{
      maxWidth: 880,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 56,
      flexWrap: 'wrap',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 数字人 — 水墨画框 */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* 外层装饰框 */}
        <div style={{
          position: 'absolute',
          inset: -12,
          border: '1px solid rgba(106,156,137,0.2)',
          borderRadius: '52% 48% 52% 48%',
          animation: 'breatheGlow 4s ease-in-out infinite',
        }} />

        <div style={{
          width: 280,
          height: 380,
          borderRadius: '50% 48% 52% 50%',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #F0F4FF 0%, #E8F0FE 50%, #F8F6F2 100%)',
          boxShadow: '0 0 0 2px rgba(106,156,137,0.3), 0 0 0 6px rgba(106,156,137,0.1), 0 0 0 12px rgba(106,156,137,0.05), 0 12px 40px rgba(26,22,20,0.12)',
          position: 'relative',
        }}>
          <DigitalHuman width={280} height={380} />

          {/* 宣纸纹理叠层 */}
          <div style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 'inherit',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        </div>

        {/* 底部名签 */}
        <div style={{
          position: 'absolute',
          bottom: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 20px',
          background: 'rgba(106,156,137,0.9)',
          borderRadius: 20,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 12px rgba(106,156,137,0.3)',
          zIndex: 2,
        }}>
          <span style={{
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 4,
            fontFamily: "'Noto Serif SC', serif",
          }}>
            小灵 · 数字导览员
          </span>
        </div>
      </div>

      {/* 文案区 */}
      <div style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
        <h3 style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#2A2520',
          marginBottom: 8,
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
          letterSpacing: '0.1em',
        }}>
          您的专属导览员
        </h3>
        <div style={{
          width: 48,
          height: 3,
          background: 'linear-gradient(to right, #C84B31, transparent)',
          borderRadius: 2,
          marginBottom: 20,
        }} />
        <p style={{
          fontSize: 15,
          lineHeight: 2.0,
          color: '#5C554C',
          marginBottom: 28,
          fontFamily: "'Noto Serif SC', serif",
        }}>
          我是小灵，您的灵山胜境数字导览员。有任何问题都可以随时向我提问，
          无论是景点介绍、路线规划还是历史文化，我都能为您详细解答。
        </p>
        <Link to="/chat" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 28px',
          background: 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          borderRadius: 10,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(106,156,137,0.3)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
          letterSpacing: '0.1em',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 6px 24px rgba(106,156,137,0.4)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = '0 4px 16px rgba(106,156,137,0.3)';
        }}>
          <MessageOutlined /> 开始对话
        </Link>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════
   页脚 — 山景剪影 + 印章
   ═══════════════════════════════════════ */
const Footer: React.FC = () => (
  <footer style={{
    position: 'relative',
    padding: '0 24px 32px',
    background: '#2A2520',
    color: '#A8A198',
    textAlign: 'center',
    overflow: 'hidden',
  }}>
    {/* 山景剪影 */}
    <svg style={{
      display: 'block',
      width: '100%',
      height: 60,
      marginBottom: 32,
    }} viewBox="0 0 1440 60" preserveAspectRatio="none">
      <path
        d="M0,60 L0,40 Q40,20 80,35 Q120,10 160,28 Q200,5 240,22 Q280,8 320,25 Q360,3 400,18 Q440,8 480,22 Q520,2 560,15 Q600,5 640,20 Q680,0 720,12 Q760,5 800,18 Q840,2 880,15 Q920,8 960,20 Q1000,5 1040,18 Q1080,10 1120,22 Q1160,8 1200,20 Q1240,12 1280,25 Q1320,10 1360,28 Q1400,15 1440,30 L1440,60 Z"
        fill="#F7F5F0"
      />
    </svg>

    {/* 内容 */}
    <div style={{ position: 'relative', zIndex: 1 }}>
      <InkDivider />
      <div style={{ paddingTop: 24 }}>
        <p style={{
          fontSize: 15,
          marginBottom: 8,
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
          letterSpacing: '0.1em',
          color: '#C0BBB6',
        }}>
          智慧灵山胜境 · 数字人导览系统
        </p>
        <p style={{ fontSize: 12, opacity: 0.5 }}>
          &copy; 2026 灵山胜境旅游发展有限公司 版权所有
        </p>
      </div>
    </div>

    {/* 印章装饰 */}
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 24,
      width: 44,
      height: 44,
      border: '2px solid rgba(200,75,49,0.35)',
      color: 'rgba(200,75,49,0.35)',
      fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
      fontSize: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'rotate(-5deg)',
      borderRadius: 4,
    }}>
      灵
      <div style={{
        position: 'absolute',
        inset: 3,
        border: '1px solid rgba(200,75,49,0.2)',
        borderRadius: 2,
      }} />
    </div>
  </footer>
);

/* ═══════════════════════════════════════
   主组件
   ═══════════════════════════════════════ */
const HomePage: React.FC = () => (
  <div style={{ position: 'relative' }}>
    <HeroSection />
    <RevealOnScroll delay={0}>
      <IntroSection />
    </RevealOnScroll>
    <RevealOnScroll delay={80}>
      <FeatureSection />
    </RevealOnScroll>
    <RevealOnScroll delay={80}>
      <FeaturedSpots />
    </RevealOnScroll>
    <RevealOnScroll delay={80}>
      <DigitalHumanSection />
    </RevealOnScroll>
    <Footer />
  </div>
);

export default HomePage;
