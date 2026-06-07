import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTimeline, getTodayInHistory, type TimelineEvent } from '../../api/history';

/* ================================================================
   朝代视觉主题 — 每个时代有独特的色彩与氛围
   ================================================================ */

interface EraTheme {
  color: string;
  bg: string;
  glow: string;
  label: string;
  icon: string;
  gradient: string;
  pattern?: string;
}

const ERA_THEMES: Record<string, EraTheme> = {
  '唐代': {
    color: '#B45309', bg: 'rgba(180,83,9,0.06)', glow: 'rgba(180,83,9,0.3)',
    label: '盛唐', icon: '🏛️',
    gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(180,83,9,0.04) 0%, transparent 50%)',
  },
  '北宋': {
    color: '#1E40AF', bg: 'rgba(30,64,175,0.06)', glow: 'rgba(30,64,175,0.3)',
    label: '大宋', icon: '📜',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  },
  '南宋': {
    color: '#7C3AED', bg: 'rgba(124,58,237,0.06)', glow: 'rgba(124,58,237,0.3)',
    label: '南宋', icon: '🎋',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
  },
  '元代': {
    color: '#059669', bg: 'rgba(5,150,105,0.06)', glow: 'rgba(5,150,105,0.3)',
    label: '蒙元', icon: '🐎',
    gradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
  },
  '明代': {
    color: '#DC2626', bg: 'rgba(220,38,38,0.06)', glow: 'rgba(220,38,38,0.3)',
    label: '大明', icon: '⛩️',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #F87171 100%)',
  },
  '清末': {
    color: '#6B7280', bg: 'rgba(107,114,128,0.06)', glow: 'rgba(107,114,128,0.3)',
    label: '晚清', icon: '🏮',
    gradient: 'linear-gradient(135deg, #4B5563 0%, #9CA3AF 100%)',
  },
  '现代': {
    color: '#1A5FB4', bg: 'rgba(26,95,180,0.06)', glow: 'rgba(26,95,180,0.3)',
    label: '现代', icon: '🏙️',
    gradient: 'linear-gradient(135deg, #1A5FB4 0%, #60A5FA 100%)',
  },
};

const getTheme = (era: string): EraTheme =>
  ERA_THEMES[era] || {
    color: '#666', bg: 'rgba(0,0,0,0.04)', glow: 'rgba(0,0,0,0.15)',
    label: era, icon: '📍',
    gradient: 'linear-gradient(135deg, #666 0%, #999 100%)',
  };

/* ================================================================
   滚动进入动画 Hook（IntersectionObserver）
   ================================================================ */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ================================================================
   时间轴卡片 — 带入场动画
   ================================================================ */

const TimelineCard: React.FC<{ event: TimelineEvent; index: number }> = ({ event, index }) => {
  const { ref, visible } = useScrollReveal();
  const theme = getTheme(event.era);
  const delay = (index % 5) * 80;

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        marginBottom: 28,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0) translateY(0)' : 'translateX(30px) translateY(10px)',
        transition: `all 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      {/* 连接圆点 — 呼吸光效 */}
      <div style={{
        position: 'absolute', left: -30, top: 8, width: 16, height: 16,
        borderRadius: '50%', border: '3px solid #fff',
        background: theme.color,
        boxShadow: visible ? `0 0 0 4px ${theme.glow}, 0 0 12px ${theme.glow}` : 'none',
        transition: `box-shadow 800ms ease ${delay + 200}ms`,
        zIndex: 2,
      }} />

      {/* 卡片 */}
      <div
        className="section-card"
        style={{
          padding: '18px 22px',
          borderLeft: `3px solid ${theme.color}`,
          background: visible ? theme.bg : 'transparent',
          transition: `background 500ms ease ${delay}ms`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景装饰 — 朝代纹理 */}
        {theme.pattern && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: theme.pattern,
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* 朝代 + 年份 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 10,
              background: theme.gradient, color: '#fff', fontWeight: 600,
              letterSpacing: 1, fontFamily: 'var(--font-serif)',
            }}>
              {theme.icon} {event.era}
            </span>
            <span style={{
              fontSize: 20, fontWeight: 800, color: theme.color,
              fontFamily: 'var(--font-calligraphy)', letterSpacing: 2,
              lineHeight: 1,
            }}>
              {event.year}
            </span>
            {event.spot && (
              <span style={{
                fontSize: 12, color: 'var(--text-tertiary)',
                marginLeft: 'auto', fontFamily: 'var(--font-serif)',
              }}>
                📍 {event.spot}
              </span>
            )}
          </div>

          {/* 事件标题 */}
          <h4 style={{
            margin: '0 0 6px', fontSize: 16, fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-serif)',
          }}>
            {event.event}
          </h4>

          {/* 描述 */}
          <p style={{
            margin: 0, fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.8, fontFamily: 'var(--font-serif)',
          }}>
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   朝代分隔标题 — 水墨晕染入场
   ================================================================ */

const EraDivider: React.FC<{ era: string; index: number }> = ({ era, index }) => {
  const { ref, visible } = useScrollReveal();
  const theme = getTheme(era);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative', marginBottom: 20, marginTop: index === 0 ? 0 : 36,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.85)',
        transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* 圆点 */}
      <div style={{
        position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)',
        width: 20, height: 20, borderRadius: '50%',
        background: theme.gradient,
        boxShadow: visible ? `0 0 0 6px ${theme.glow}, 0 0 20px ${theme.glow}` : 'none',
        transition: 'box-shadow 1s ease 200ms',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#fff',
        zIndex: 2,
      }}>
        {theme.icon}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        background: `linear-gradient(90deg, ${theme.bg} 0%, transparent 100%)`,
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: '0 12px 12px 0',
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'var(--font-calligraphy)',
          color: theme.color, letterSpacing: 3,
        }}>
          {theme.label}
        </span>
        <div style={{
          flex: 1, height: 1,
          background: `linear-gradient(to right, ${theme.color}40, transparent)`,
        }} />
        <span style={{
          fontSize: 11, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-serif)', letterSpacing: 1,
        }}>
          {era}
        </span>
      </div>
    </div>
  );
};

/* ================================================================
   主组件
   ================================================================ */

const TimelineView: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [eras, setEras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEra, setActiveEra] = useState('');
  const [todayCard, setTodayCard] = useState<any>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const [axisProgress, setAxisProgress] = useState(0);

  useEffect(() => {
    Promise.all([getTimeline(), getTodayInHistory()])
      .then(([tlRes, tcRes]) => {
        const tl = (tlRes as any).data ?? tlRes;
        const tc = (tcRes as any).data ?? tcRes;
        setEvents(tl.events || []);
        setEras(tl.eras || []);
        setTodayCard(tc.card || tc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 时间轴生长动画 — 滚动进度
  const handleScroll = useCallback(() => {
    if (!axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const totalH = rect.height;
    const scrolled = viewportH - rect.top;
    const progress = Math.min(Math.max(scrolled / totalH, 0), 1);
    setAxisProgress(progress);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const filtered = activeEra ? events.filter((e) => e.era === activeEra) : events;

  // 按朝代分组
  const grouped: { era: string; events: TimelineEvent[] }[] = [];
  let lastEra = '';
  filtered.forEach((ev) => {
    if (ev.era !== lastEra) {
      grouped.push({ era: ev.era, events: [ev] });
      lastEra = ev.era;
    } else {
      grouped[grouped.length - 1].events.push(ev);
    }
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 16px',
          border: '2px solid var(--gray-200)', borderTopColor: 'var(--color-primary)',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: 2 }}>
          穿越时空中...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ 时空之门 — 顶部装饰 ═══ */}
      <div style={{
        position: 'relative',
        padding: '28px 24px',
        marginBottom: 28,
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(180,83,9,0.08) 0%, rgba(26,95,180,0.08) 100%)',
        overflow: 'hidden',
      }}>
        {/* 时光涟漪 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 300, height: 300,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '1px solid rgba(180,83,9,0.08)',
          animation: 'rippleExpand 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 200, height: 200,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '1px solid rgba(26,95,180,0.08)',
          animation: 'rippleExpand 4s ease-in-out infinite 1s',
          pointerEvents: 'none',
        }} />

        <div style={{
          fontSize: 28, fontWeight: 800,
          fontFamily: 'var(--font-calligraphy)',
          color: 'var(--text-primary)',
          letterSpacing: 6, marginBottom: 4,
          position: 'relative',
        }}>
          千年一瞬
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-serif)', letterSpacing: 2,
          position: 'relative',
        }}>
          从盛唐到现代 · {events.length} 段历史记忆
        </div>
      </div>

      {/* ═══ 那年今日 ═══ */}
      {todayCard && (
        <div className="section-card animate-fade-in-up" style={{
          padding: '18px 24px', marginBottom: 24,
          borderLeft: '4px solid #C8882E',
          background: 'linear-gradient(135deg, rgba(200,136,46,0.06) 0%, transparent 100%)',
        }}>
          <div style={{
            fontSize: 13, color: '#B45309', fontWeight: 600, marginBottom: 6,
            fontFamily: 'var(--font-serif)', letterSpacing: 1,
          }}>
            📜 那年今日
          </div>
          <h4 style={{
            margin: '0 0 6px', fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font-serif)',
          }}>
            {todayCard.title}
          </h4>
          <p style={{
            margin: 0, fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.8, fontFamily: 'var(--font-serif)',
          }}>
            <span style={{
              fontWeight: 700, color: '#B45309',
              fontFamily: 'var(--font-calligraphy)', fontSize: 16,
            }}>
              {todayCard.year_ago}
            </span>
            {' — '}{todayCard.description}
          </p>
        </div>
      )}

      {/* ═══ 朝代过滤器 — 胶囊标签 ═══ */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28,
        padding: '4px 0',
      }}>
        <button
          onClick={() => setActiveEra('')}
          style={{
            padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            border: !activeEra ? 'none' : '1.5px solid var(--border-light)',
            background: !activeEra
              ? 'linear-gradient(135deg, var(--color-primary) 0%, #4A8B73 100%)'
              : 'rgba(255,255,255,0.7)',
            color: !activeEra ? '#fff' : 'var(--text-secondary)',
            fontWeight: !activeEra ? 600 : 400,
            fontFamily: 'var(--font-serif)', letterSpacing: 1,
            transition: 'all 300ms ease',
            boxShadow: !activeEra ? '0 2px 8px rgba(106,156,137,0.3)' : 'none',
          }}
        >
          全部朝代
        </button>
        {eras.map((era) => {
          const t = getTheme(era);
          const active = activeEra === era;
          return (
            <button
              key={era}
              onClick={() => setActiveEra(era)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                border: active ? 'none' : '1.5px solid var(--border-light)',
                background: active ? t.gradient : 'rgba(255,255,255,0.7)',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-serif)', letterSpacing: 1,
                transition: 'all 300ms ease',
                boxShadow: active ? `0 2px 8px ${t.glow}` : 'none',
              }}
            >
              {t.icon} {era}
            </button>
          );
        })}
      </div>

      {/* ═══ 时间轴 — 带生长动画 ═══ */}
      <div ref={axisRef} style={{ position: 'relative', paddingLeft: 36 }}>
        {/* 时间轴主线 — 渐变生长 */}
        <div style={{
          position: 'absolute', left: 13, top: 0, bottom: 0, width: 3,
          background: 'var(--gray-200)',
          borderRadius: 2,
        }} />
        {/* 时间轴光线 — 跟随滚动 */}
        <div style={{
          position: 'absolute', left: 13, top: 0,
          height: `${axisProgress * 100}%`,
          width: 3,
          background: 'linear-gradient(180deg, #C8882E 0%, #7C3AED 40%, #DC2626 70%, #1A5FB4 100%)',
          borderRadius: 2,
          transition: 'height 100ms linear',
          boxShadow: '0 0 6px rgba(200,136,46,0.3)',
        }} />

        {/* 按朝代分组渲染 */}
        {grouped.map((group, gIdx) => (
          <div key={group.era}>
            <EraDivider era={group.era} index={gIdx} />
            {group.events.map((event, eIdx) => (
              <TimelineCard
                key={`${group.era}-${eIdx}`}
                event={event}
                index={eIdx}
              />
            ))}
          </div>
        ))}

        {/* 终点标记 — 现代 */}
        <div style={{
          position: 'relative', marginTop: 16,
          opacity: axisProgress > 0.8 ? 1 : 0,
          transform: axisProgress > 0.8 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 600ms ease',
        }}>
          <div style={{
            position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)',
            width: 20, height: 20, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1A5FB4, #60A5FA)',
            boxShadow: '0 0 0 6px rgba(26,95,180,0.2), 0 0 20px rgba(26,95,180,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#fff', zIndex: 2,
          }}>
            ✦
          </div>
          <div style={{
            padding: '14px 20px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(26,95,180,0.08) 0%, transparent 100%)',
            borderLeft: '3px solid #1A5FB4',
            borderRadius: '0 12px 12px 0',
          }}>
            <span style={{
              fontSize: 15, fontWeight: 700,
              fontFamily: 'var(--font-calligraphy)',
              color: '#1A5FB4', letterSpacing: 3,
            }}>
              此刻，历史仍在书写...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
