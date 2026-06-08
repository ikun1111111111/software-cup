import React from 'react';

/**
 * 远山雾气流动层
 * 多层半透明白雾横向流动，营造层次感
 * 规范文档 4.1 节：远山雾气流动
 */

const MistLayer: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* 雾气层1 — 底层，慢速 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-20%',
          width: '140%',
          height: '100%',
          background: `linear-gradient(
            to top,
            rgba(247, 245, 240, 0.5) 0%,
            rgba(247, 245, 240, 0.2) 30%,
            transparent 60%
          )`,
          animation: 'mistFlow1 25s linear infinite',
        }}
      />
      {/* 雾气层2 — 中层，中速 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-10%',
          width: '120%',
          height: '70%',
          background: `linear-gradient(
            to top,
            rgba(247, 245, 240, 0.35) 0%,
            rgba(247, 245, 240, 0.1) 40%,
            transparent 70%
          )`,
          animation: 'mistFlow2 18s linear infinite',
        }}
      />
      {/* 雾气层3 — 顶层，快速 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '-5%',
          width: '110%',
          height: '45%',
          background: `linear-gradient(
            to top,
            rgba(247, 245, 240, 0.25) 0%,
            transparent 50%
          )`,
          animation: 'mistFlow3 12s linear infinite',
        }}
      />
      <style>{`
        @keyframes mistFlow1 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-8%); }
        }
        @keyframes mistFlow2 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-12%); }
        }
        @keyframes mistFlow3 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-15%); }
        }
      `}</style>
    </div>
  );
};

export default MistLayer;
