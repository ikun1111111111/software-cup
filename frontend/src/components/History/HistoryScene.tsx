import React from 'react';

export type Era = 'tang' | 'song' | 'ming';

interface HistorySceneProps {
  era: Era;
  isVisible: boolean;
  showSeal?: boolean;
  showTitle?: boolean;
  onAnimationComplete?: () => void;
}

const ERA_CONFIG: Record<Era, {
  bg: string;
  tint: string;
  seal: string;
  title: string;
}> = {
  tang: {
    bg: '/image/history/bg-era-tang.png',
    tint: 'rgba(200, 160, 100, 0.10)',
    seal: '/image/history/seal-tang.png',
    title: '/image/history/title-tang.png',
  },
  song: {
    bg: '/image/history/bg-era-song.png',
    tint: 'rgba(140, 170, 150, 0.10)',
    seal: '/image/history/seal-song.png',
    title: '/image/history/title-song.png',
  },
  ming: {
    bg: '/image/history/bg-era-ming.png',
    tint: 'rgba(200, 120, 100, 0.10)',
    seal: '/image/history/seal-ming.png',
    title: '/image/history/title-ming.png',
  },
};

const HistoryScene: React.FC<HistorySceneProps> = ({
  era,
  isVisible,
  showSeal = true,
  showTitle = true,
  onAnimationComplete,
}) => {
  const config = ERA_CONFIG[era];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1200ms ease',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 朝代背景图 */}
      <div
        style={{
          position: 'absolute',
          inset: '-5%',
          backgroundImage: `url('${config.bg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(1.15)',
          transition: 'opacity 1200ms ease, transform 1800ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* 朝代色调滤镜 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: config.tint,
          mixBlendMode: 'multiply',
        }}
      />

      {/* 古画质感叠加 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/image/history/paper-aged.jpg')",
          backgroundSize: 'cover',
          opacity: 0.12,
          mixBlendMode: 'multiply',
        }}
      />

      {/* 底部暗角 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(20,18,16,0.55) 0%, transparent 35%)',
        }}
      />

      {/* 印章 */}
      {showSeal && (
        <div
          style={{
            position: 'absolute',
            top: '6%',
            right: '5%',
            width: 'clamp(64px, 10vmin, 120px)',
            aspectRatio: '1',
          }}
        >
          {/* 墨痕扩散伪效果 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(60,40,30,0.35) 0%, transparent 70%)',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 500ms ease 200ms',
            }}
          />
          <img
            src={config.seal}
            alt=""
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: isVisible ? 0.9 : 0,
              transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.6)',
              transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDelay: isVisible ? '200ms' : '0ms',
            }}
          />
        </div>
      )}

      {/* 朝代标题 */}
      {showTitle && (
        <img
          src={config.title}
          alt=""
          style={{
            position: 'absolute',
            top: '6%',
            left: '50%',
            width: 'clamp(200px, 40vmin, 420px)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible
              ? 'translateX(-50%) translateY(0)'
              : 'translateX(-50%) translateY(24px)',
            transition: 'all 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: isVisible ? '400ms' : '0ms',
          }}
        />
      )}
    </div>
  );
};

export default HistoryScene;
