import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ================================================================
   WelcomeScreen — 水墨山水画入场动画
   预加载 ChatPage 资源后自动跳转到对话页面
   ================================================================ */

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  /* ---------- 资源预加载 ---------- */
  useEffect(() => {
    const imagesToPreload = [
      '/image/AigcAssets3.png',
      '/image/bg-mountain-far.png',
      '/image/bg-mountain-mid.png',
      '/image/bg-cloud-layer-wide.png',
      '/image/bg-water-ripple.png',
      '/image/bg-foreground-left.png',
      '/image/bg-foreground-right.png',
    ];

    // Preload images and track completion
    let loaded = 0;
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => { loaded++; };
      img.src = src;
    });

    // Preload Live2D model via <link> for browser cache
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = '/models/haru/haru_greeter_t03.model3.json';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  /* ---------- 入场动画时间轴 ---------- */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 0 → 1: 水墨背景淡入 + 缓慢放大
    timers.push(setTimeout(() => setPhase(1), 100));

    // Phase 1 → 2: 内容区域浮现
    timers.push(setTimeout(() => setPhase(2), 900));

    // Phase 2 → 3: 印章盖下
    timers.push(setTimeout(() => setPhase(3), 1800));

    // 动画结束，开始退场
    timers.push(setTimeout(() => {
      setIsExiting(true);
    }, 4200));

    // 退场完成后跳转
    timers.push(setTimeout(() => {
      navigate('/chat', { replace: true });
    }, 5200));

    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: '#F5F0E8',
        zIndex: 100,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isExiting ? 'none' : 'auto',
      }}
    >
      {/* 背景：水墨山水 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/image/AigcAssets3.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: phase >= 1 ? 'scale(1)' : 'scale(1.1)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'transform 4.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.2s ease',
        }}
      />

      {/* 淡墨遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(26,22,20,0.2) 0%, rgba(26,22,20,0.45) 70%),
            linear-gradient(180deg, rgba(26,22,20,0.35) 0%, rgba(26,22,20,0.15) 40%, rgba(26,22,20,0.35) 100%)
          `,
        }}
      />

      {/* 水墨晕染开场 —— 白色遮罩退去 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#F7F5F0',
          opacity: phase >= 1 ? 0 : 1,
          transition: 'opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}
      />

      {/* 内容区域 */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* 印章 */}
        <div
          style={{
            width: 72,
            height: 72,
            border: '2.5px solid rgba(200, 75, 49, 0.85)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
            fontSize: 36,
            color: 'rgba(200, 75, 49, 0.95)',
            transform: phase >= 3 ? 'rotate(-4deg) scale(1)' : 'rotate(-12deg) scale(1.4)',
            opacity: phase >= 3 ? 1 : 0,
            transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 0 0 6px rgba(200, 75, 49, 0.08)',
            position: 'relative',
          }}
        >
          灵
          <div
            style={{
              position: 'absolute',
              inset: 6,
              border: '1px solid rgba(200, 75, 49, 0.3)',
              borderRadius: 3,
            }}
          />
        </div>

        <h1
          style={{
            fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', 'STSong', serif",
            fontSize: 88,
            fontWeight: 900,
            letterSpacing: '0.35em',
            textShadow: '0 4px 40px rgba(0,0,0,0.45)',
            lineHeight: 1.1,
            marginLeft: '0.35em',
          }}
        >
          灵山胜境
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: 120,
              height: 1,
              background: 'linear-gradient(to right, transparent, rgba(245,240,232,0.6), transparent)',
            }}
          />
          <p
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: 22,
              letterSpacing: '0.35em',
              opacity: 0.9,
              textShadow: '0 1px 12px rgba(0,0,0,0.4)',
            }}
          >
            AI 数字导览
          </p>
          <p
            style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: 16,
              letterSpacing: '0.2em',
              opacity: 0.65,
              textShadow: '0 1px 8px rgba(0,0,0,0.35)',
            }}
          >
            一步一景 · 一景一画
          </p>
        </div>
      </div>

      {/* 底部进度条 */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 160,
          height: 2,
          background: 'rgba(245,240,232,0.2)',
          borderRadius: 1,
          overflow: 'hidden',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1s ease',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            background: 'rgba(245,240,232,0.7)',
            transformOrigin: 'left',
            animation: 'welcomeProgress 4.8s linear forwards',
          }}
        />
      </div>

      {/* 预加载提示 */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 12,
          letterSpacing: '0.15em',
          color: 'rgba(245,240,232,0.5)',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1s ease 0.5s',
        }}
      >
        正在准备导览...
      </div>

      <style>{`
        @keyframes welcomeProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
