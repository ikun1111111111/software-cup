import React, { useEffect, useRef, useState } from 'react';

/**
 * "墨落生山" — 电影级水墨入场
 * 墨滴落在宣纸上，每处墨迹逐渐擦除纸层，露出底下的山水画
 */

type Phase = 'paper' | 'raining' | 'reveal' | 'title' | 'seal' | 'exit' | 'done';

const TITLE = '智慧灵山胜境';

interface Drop {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

/* 15 颗墨滴，延迟完全随机，扩散范围更大 */
const BASE_DROPS = [
  { id: 0, x: 8, y: 15, size: 24 },
  { id: 1, x: 25, y: 8, size: 20 },
  { id: 2, x: 45, y: 20, size: 28 },
  { id: 3, x: 65, y: 12, size: 24 },
  { id: 4, x: 85, y: 25, size: 22 },
  { id: 5, x: 15, y: 40, size: 26 },
  { id: 6, x: 40, y: 45, size: 30 },
  { id: 7, x: 70, y: 50, size: 24 },
  { id: 8, x: 92, y: 55, size: 22 },
  { id: 9, x: 10, y: 70, size: 28 },
  { id: 10, x: 35, y: 75, size: 24 },
  { id: 11, x: 55, y: 80, size: 26 },
  { id: 12, x: 78, y: 78, size: 22 },
  { id: 13, x: 50, y: 55, size: 30 },
  { id: 14, x: 20, y: 55, size: 24 },
];

const DROPS: Drop[] = BASE_DROPS.map(d => ({
  ...d,
  delay: 200 + Math.floor(Math.random() * 1500),
}));

const DROP_LIFETIME = 1200;
const LAST_DROP_END = Math.max(...DROPS.map(d => d.delay + DROP_LIFETIME)) + 50;

const InkEntryOverlay: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('paper');
  const [visibleDrops, setVisibleDrops] = useState<Set<number>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawnRef = useRef<Set<number>>(new Set());
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // 初始化 canvas
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    // 画满宣纸（半透明宣纸色）
    ctx.fillStyle = '#F5EFE0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 宣纸纹理
    ctx.fillStyle = 'rgba(180,160,120,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 边缘泛黄
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2,
      canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2,
      canvas.width * 0.6
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(180,160,120,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // 绘制一颗墨滴（用 destination-out 擦除宣纸）
  const drawDrop = (drop: Drop, elapsed: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const dropElapsed = elapsed - drop.delay;
    if (dropElapsed < 0) return;

    const progress = Math.min(dropElapsed / DROP_LIFETIME, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);

    const px = (drop.x / 100) * canvas.width;
    const py = (drop.y / 100) * canvas.height;
    const maxRadius = drop.size * 8 * (window.innerWidth / 1920);
    const radius = maxRadius * eased;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // 中心擦除（强）
    const centerGrad = ctx.createRadialGradient(px, py, 0, px, py, radius);
    centerGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
    centerGrad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // 外围不规则边缘（模拟墨晕）
    const outerGrad = ctx.createRadialGradient(px, py, radius * 0.5, px, py, radius * 1.4);
    outerGrad.addColorStop(0, 'rgba(0,0,0,0)');
    outerGrad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
    outerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 动画循环
  useEffect(() => {
    if (!visibleDrops.size) return;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      DROPS.forEach(drop => {
        if (visibleDrops.has(drop.id) && !drawnRef.current.has(drop.id)) {
          const dropElapsed = elapsed - drop.delay;
          if (dropElapsed >= 0) {
            drawDrop(drop, elapsed);
            const progress = dropElapsed / DROP_LIFETIME;
            if (progress >= 1) {
              drawnRef.current.add(drop.id);
            }
          }
        }
      });

      // 如果还没画完，继续动画
      if (drawnRef.current.size < DROPS.length) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [visibleDrops]);

  useEffect(() => {
    if (sessionStorage.getItem('inkEntryShown')) {
      setPhase('done');
      return;
    }
    sessionStorage.setItem('inkEntryShown', '1');

    initCanvas();

    const phaseTimers = [
      setTimeout(() => setPhase('raining'), 200),
      setTimeout(() => setPhase('reveal'), LAST_DROP_END + 800),
      setTimeout(() => setPhase('title'), LAST_DROP_END + 1800),
      setTimeout(() => setPhase('seal'), LAST_DROP_END + 2600),
      setTimeout(() => setPhase('exit'), LAST_DROP_END + 3400),
      setTimeout(() => setPhase('done'), LAST_DROP_END + 4200),
    ];

    const dropTimers = DROPS.map(drop =>
      setTimeout(() => {
        setVisibleDrops(prev => new Set(prev).add(drop.id));
      }, drop.delay)
    );

    return () => {
      phaseTimers.forEach(clearTimeout);
      dropTimers.forEach(clearTimeout);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // 窗口 resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // 重新初始化（简化版）
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F5EFE0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (phase === 'done') return null;

  const atOrAfter = (p: Phase): boolean => {
    const order: Phase[] = ['paper', 'raining', 'reveal', 'title', 'seal', 'exit', 'done'];
    return order.indexOf(phase) >= order.indexOf(p);
  };

  const visible = phase !== 'exit' && phase !== 'done';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 9999, overflow: 'hidden', pointerEvents: 'none',
      clipPath: phase === 'exit' || phase === 'done'
        ? 'inset(0 0 100% 0)'
        : 'inset(0 0 0 0)',
      transition: 'clip-path 800ms cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* ═══ 底层：山水画 ═══ */}
      <img
        src="/image/image.png"
        alt="水墨山水"
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />

      {/* ═══ 中层：宣纸 canvas（被墨滴擦除） ═══ */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          zIndex: 2,
          opacity: atOrAfter('reveal') ? 0 : 1,
          transition: 'opacity 1500ms ease',
        }}
      />

      {/* ═══ 上层：墨滴视觉效果 ═══ */}
      {DROPS.filter(d => visibleDrops.has(d.id)).map(drop => (
        <div
          key={drop.id}
          style={{
            position: 'fixed',
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
          }}
        >
          {/* 墨滴核心 */}
          <div style={{
            width: drop.size,
            height: drop.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, #0d0a08 0%, #1a1410 40%, rgba(26,20,16,0.4) 70%, transparent 100%)`,
            animation: `inkDropAppear ${DROP_LIFETIME}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
          }}>
            {/* 晕染 */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: drop.size * 3,
              height: drop.size * 3,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(26,20,16,0.15) 0%, rgba(26,20,16,0.05) 40%, transparent 65%)`,
              animation: `inkSpread ${DROP_LIFETIME}ms ease-out both`,
            }} />
          </div>
        </div>
      ))}

      {/* ═══ 标题 ══ */}
      <div style={{
        position: 'absolute', top: '12%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        zIndex: 15,
        opacity: atOrAfter('title') && visible ? 1 : 0,
        transition: 'opacity 1000ms ease',
      }}>
        <div style={{
          fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900,
          letterSpacing: '10px', color: '#1a1410',
          fontFamily: "'Noto Serif SC', 'STSong', 'SimSun', serif",
          textShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}>{TITLE}</div>
        <div style={{
          fontSize: 'clamp(14px, 2.5vw, 18px)', color: '#5C554C',
          letterSpacing: '12px', fontWeight: 400,
          fontFamily: "'Noto Serif SC', 'STSong', serif",
        }}>数字人导览系统</div>
      </div>

      {/* ═══ 印章 ═══ */}
      <div style={{
        position: 'absolute', bottom: '12%', right: '8%',
        width: 72, height: 72, zIndex: 15,
        opacity: atOrAfter('seal') && visible ? 1 : 0,
        transform: atOrAfter('seal') && visible
          ? 'scale(1) rotate(-8deg)' : 'scale(3) rotate(-8deg)',
        transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: '100%', height: '100%',
          border: '3px solid #C84B31', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', fontWeight: 900, color: '#C84B31',
          background: 'rgba(200,75,49,0.08)',
          fontFamily: "'Noto Serif SC', serif",
          textShadow: '0 0 8px rgba(200,75,49,0.3)',
        }}>灵</div>
      </div>

      <style>{`
        @keyframes inkDropAppear {
          0%   { transform: scale(0.2); opacity: 0; }
          5%   { transform: scale(1); opacity: 1; }
          20%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.15; }
        }
        @keyframes inkSpread {
          0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          15%  { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default InkEntryOverlay;
