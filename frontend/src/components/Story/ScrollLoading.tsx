import React from 'react';

interface ScrollLoadingProps {
  label?: string;
}

const ScrollLoading: React.FC<ScrollLoadingProps> = ({ label = '翻开故事卷轴' }) => (
  <div
    style={{
      position: 'relative',
      width: 320,
      height: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <style>{`
      @keyframes scrollUnfurl {
        0%   { transform: scaleX(0); opacity: 0; }
        18%  { opacity: 1; }
        100% { transform: scaleX(1); opacity: 1; }
      }
      @keyframes scrollRodLeft {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-150px); }
      }
      @keyframes scrollRodRight {
        0%   { transform: translateX(0); }
        100% { transform: translateX(150px); }
      }
      @keyframes scrollTextReveal {
        0%, 55% { opacity: 0; transform: translateY(4px); letter-spacing: 0.4em; }
        100%     { opacity: 1; transform: translateY(0); letter-spacing: 0.22em; }
      }
      @keyframes scrollInkSettle {
        0%, 60% { opacity: 0; transform: scale(0.6); }
        100%     { opacity: 1; transform: scale(1); }
      }
      @keyframes scrollMistDrift {
        0%, 100% { transform: translateX(-8px); opacity: 0.5; }
        50%      { transform: translateX(8px); opacity: 0.75; }
      }
    `}</style>

    {/* 展开的宣纸卷面 */}
    <div
      style={{
        position: 'absolute',
        left: 10,
        right: 10,
        top: 56,
        bottom: 56,
        background:
          'linear-gradient(180deg, rgba(245,241,232,0.94) 0%, rgba(235,228,214,0.90) 100%)',
        backgroundImage:
          "var(--texture-paper), linear-gradient(180deg, rgba(245,241,232,0.94) 0%, rgba(235,228,214,0.90) 100%)",
        boxShadow:
          'inset 0 0 24px rgba(120,96,60,0.14), 0 6px 24px rgba(0,0,0,0.28)',
        transformOrigin: 'center',
        transform: 'scaleX(0)',
        opacity: 0,
        animation: 'scrollUnfurl 1100ms cubic-bezier(0.22,1,0.36,1) 120ms forwards',
        overflow: 'hidden',
      }}
    >
      {/* 卷面雾气 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(60% 80% at 50% 50%, rgba(106,156,137,0.10), transparent 70%)',
          animation: 'scrollMistDrift 3.6s ease-in-out infinite 1300ms',
        }}
      />
      {/* 竖排文案 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: 'vertical-rl',
          fontFamily: "var(--font-calligraphy), 'STKaiti', serif",
          fontSize: 22,
          color: 'rgba(42,37,32,0.82)',
          opacity: 0,
          animation: 'scrollTextReveal 900ms cubic-bezier(0.22,1,0.36,1) 900ms forwards',
        }}
      >
        {label}
      </div>
      {/* 落印 */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 12,
          width: 22,
          height: 22,
          borderRadius: 3,
          background: 'linear-gradient(135deg,#C84B31,#A03A24)',
          boxShadow: '0 1px 3px rgba(120,20,10,0.4)',
          opacity: 0,
          animation: 'scrollInkSettle 500ms cubic-bezier(0.22,1,0.36,1) 1400ms forwards',
        }}
      />
    </div>

    {/* 左卷轴杆 */}
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 44,
        bottom: 44,
        width: 14,
        marginLeft: -7,
        animation: 'scrollRodLeft 1100ms cubic-bezier(0.22,1,0.36,1) 120ms forwards',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg,#3D2E1E 0%,#6B4A2A 45%,#8B5E36 55%,#3D2E1E 100%)',
          borderRadius: 7,
          boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -8,
          bottom: -8,
          left: -3,
          right: -3,
          background: 'linear-gradient(90deg,#2A1F12,#5C3D22,#2A1F12)',
          borderRadius: 9,
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      />
    </div>

    {/* 右卷轴杆 */}
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 44,
        bottom: 44,
        width: 14,
        marginLeft: -7,
        animation: 'scrollRodRight 1100ms cubic-bezier(0.22,1,0.36,1) 120ms forwards',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg,#3D2E1E 0%,#6B4A2A 45%,#8B5E36 55%,#3D2E1E 100%)',
          borderRadius: 7,
          boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -8,
          bottom: -8,
          left: -3,
          right: -3,
          background: 'linear-gradient(90deg,#2A1F12,#5C3D22,#2A1F12)',
          borderRadius: 9,
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  </div>
);

export default ScrollLoading;
