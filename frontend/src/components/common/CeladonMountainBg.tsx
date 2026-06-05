import React, { useMemo } from 'react';

/**
 * 青绿山水背景组件
 * 多层 SVG 山峦剪影 — 灵感来自太湖碧波、青龙山、小灵山风水格局
 * 配色：天青 #B8D4E3 → 茶绿 #6BA292 → 深青 #4A8B7A
 */

interface CeladonMountainBgProps {
  density?: 'subtle' | 'medium' | 'rich';
  /** 是否显示飞鸟 */
  showBirds?: boolean;
  /** 是否显示太湖水面波纹 */
  showWater?: boolean;
  /** 是否显示佛塔尖顶暗示 */
  showPagoda?: boolean;
}

const PATHS = {
  // 远山 — 天青色，像太湖对岸的薄雾
  far: 'M0,70 Q80,48 160,62 Q220,40 300,58 Q380,38 460,52 Q520,42 600,48 L600,150 L0,150 Z',
  // 中山 — 茶绿，青龙山轮廓
  mid: 'M0,95 Q60,72 140,88 Q200,60 280,80 Q360,55 440,75 Q520,58 600,72 L600,150 L0,150 Z',
  // 近山 — 深青，小灵山主峰
  near: 'M0,118 Q100,95 180,112 Q260,82 340,105 Q420,78 500,98 L600,115 L600,150 L0,150 Z',
  // 佛塔尖 — 极淡金色，暗示梵宫
  pagoda: 'M290,60 L300,38 L310,60 L306,60 L306,70 L294,70 L294,60 Z',
};

const DENSITY_MAP: Record<string, string[]> = {
  subtle: [PATHS.far],
  medium: [PATHS.far, PATHS.mid],
  rich: [PATHS.far, PATHS.mid, PATHS.near],
};

const OPACITY_MAP: Record<string, string[]> = {
  subtle: ['0.06'],
  medium: ['0.05', '0.09'],
  rich: ['0.04', '0.08', '0.13'],
};

const COLOR_MAP: Record<string, string[]> = {
  subtle: ['#B8D4E3'],
  medium: ['#B8D4E3', '#6BA292'],
  rich: ['#B8D4E3', '#6BA292', '#4A8B7A'],
};

const CeladonMountainBg: React.FC<CeladonMountainBgProps> = ({
  density = 'medium',
  showBirds = false,
  showWater = false,
  showPagoda = false,
}) => {
  const paths = DENSITY_MAP[density];
  const opacities = OPACITY_MAP[density];
  const colors = COLOR_MAP[density];

  const svgContent = useMemo(() => (
    <svg
      viewBox="0 0 600 150"
      preserveAspectRatio="xMidYMax slice"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '50%',
        pointerEvents: 'none',
        opacity: 0.9,
      }}
    >
      <defs>
        <filter id="mistBlur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#B8D4E3" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#6BA292" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* 山峦层 */}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={colors[i] || '#6BA292'}
          opacity={opacities[i] || '0.05'}
          filter={i === 0 ? 'url(#mistBlur)' : undefined}
        />
      ))}

      {/* 佛塔尖 */}
      {showPagoda && (
        <path
          d={PATHS.pagoda}
          fill="#C8882E"
          opacity="0.06"
        />
      )}

      {/* 天青色渐变消退 */}
      <rect x="0" y="70" width="600" height="80" fill="url(#skyFade)" />

      {/* 飞鸟 — 太湖上空 */}
      {showBirds && (
        <g opacity="0.1" fill="#4A8B7A">
          <path d="M80,20 Q84,16 88,20 Q84,18 80,20Z" />
          <path d="M100,15 Q103,12 106,15 Q103,13.5 100,15Z" />
          <path d="M90,24 Q93,22 96,24 Q93,23 90,24Z" />
          <path d="M500,30 Q504,27 508,30 Q504,28.5 500,30Z" />
          <path d="M515,25 Q518,23 521,25 Q518,24 515,25Z" />
          <path d="M508,34 Q511,32 514,34 Q511,33 508,34Z" />
        </g>
      )}

      {/* 太湖水波 */}
      {showWater && (
        <g opacity="0.05" stroke="#6BA292" strokeWidth="0.5" fill="none">
          <path d="M30,138 Q90,136 150,138 Q210,140 270,138 Q330,136 390,138 Q450,140 510,138 Q550,137 580,138" />
          <path d="M50,143 Q120,141 190,143 Q260,145 330,143 Q400,141 470,143 Q520,142 570,143" />
          <path d="M70,147 Q150,146 230,147 Q310,148 390,147 Q470,146 550,147" />
        </g>
      )}
    </svg>
  ), [paths, opacities, colors, showBirds, showWater, showPagoda]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* 顶部天青色天光 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(180deg, rgba(184,212,227,0.06) 0%, transparent 100%)',
        }}
      />
      {svgContent}
    </div>
  );
};

export default CeladonMountainBg;
