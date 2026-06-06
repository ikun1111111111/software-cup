import React, { useState } from 'react';

interface Spot {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
}

const SPOTS: Spot[] = [
  { id: 'fo', name: '灵山大佛', x: 50, y: 25, description: '高88米的青铜释迦牟尼立像' },
  { id: 'fan', name: '梵宫', x: 25, y: 45, description: '佛教文化艺术殿堂' },
  { id: 'jiu', name: '九龙灌浴', x: 72, y: 40, description: '大型音乐动态群雕' },
  { id: 'wu', name: '五印坛城', x: 45, y: 65, description: '藏传佛教文化景观' },
  { id: 'man', name: '曼飞龙塔', x: 75, y: 70, description: '南传佛教象征建筑' },
];

const InkMap: React.FC = () => {
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 280,
      borderRadius: 14,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #F5F3EF 0%, #E8E5DF 50%, #F5F3EF 100%)',
    }}>
      {/* 水墨背景纹理 */}
      <svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="inkBlur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <radialGradient id="inkWash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2A2520" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#2A2520" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 水墨晕染背景 */}
        <ellipse cx="120" cy="100" rx="100" ry="70" fill="url(#inkWash)" filter="url(#inkBlur)" />
        <ellipse cx="300" cy="180" rx="80" ry="60" fill="url(#inkWash)" filter="url(#inkBlur)" />
        <ellipse cx="200" cy="140" rx="120" ry="80" fill="url(#inkWash)" filter="url(#inkBlur)" />

        {/* 山峦线条 — 工笔白描风格 */}
        <path
          d="M 20 200 Q 60 140, 100 160 Q 140 180, 180 130 Q 220 80, 260 120 Q 300 160, 340 110 Q 370 80, 400 100"
          fill="none"
          stroke="#2A2520"
          strokeWidth="1.5"
          strokeOpacity="0.15"
        />
        <path
          d="M 0 230 Q 50 190, 120 200 Q 190 210, 250 180 Q 310 150, 380 170 Q 400 180, 400 190"
          fill="none"
          stroke="#2A2520"
          strokeWidth="1"
          strokeOpacity="0.1"
        />

        {/* 云雾 */}
        <ellipse cx="80" cy="120" rx="50" ry="15" fill="#F5F3EF" fillOpacity="0.6" filter="url(#inkBlur)" />
        <ellipse cx="320" cy="90" rx="40" ry="12" fill="#F5F3EF" fillOpacity="0.5" filter="url(#inkBlur)" />

        {/* 小路 */}
        <path
          d="M 200 260 Q 190 220, 200 180 Q 210 140, 200 100"
          fill="none"
          stroke="#C8882E"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          strokeDasharray="6 4"
        />
      </svg>

      {/* 景点标记 */}
      {SPOTS.map((spot) => (
        <div
          key={spot.id}
          onMouseEnter={() => setActiveSpot(spot)}
          onMouseLeave={() => setActiveSpot(null)}
          onClick={() => setActiveSpot(activeSpot?.id === spot.id ? null : spot)}
          style={{
            position: 'absolute',
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            zIndex: activeSpot?.id === spot.id ? 10 : 1,
          }}
        >
          {/* 发光圆点 */}
          <div style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: activeSpot?.id === spot.id
              ? 'radial-gradient(circle, #C84B31 30%, rgba(200,75,49,0.3) 70%, transparent 100%)'
              : 'radial-gradient(circle, #1A5FB4 30%, rgba(26,95,180,0.3) 70%, transparent 100%)',
            boxShadow: activeSpot?.id === spot.id
              ? '0 0 12px rgba(200,75,49,0.5)'
              : '0 0 8px rgba(26,95,180,0.3)',
            transition: 'all 300ms ease',
            animation: 'mapPulse 2s ease-in-out infinite',
          }} />

          {/* 景点名称标签 */}
          <div style={{
            position: 'absolute',
            top: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 12,
            fontWeight: 600,
            color: activeSpot?.id === spot.id ? '#C84B31' : '#2A2520',
            background: 'rgba(253,251,247,0.9)',
            padding: '2px 8px',
            borderRadius: 4,
            border: `1px solid ${activeSpot?.id === spot.id ? 'rgba(200,75,49,0.3)' : 'rgba(42,37,32,0.1)'}`,
            transition: 'all 300ms ease',
            backdropFilter: 'blur(4px)',
          }}>
            {spot.name}
          </div>

          {/* 悬浮信息气泡 */}
          {activeSpot?.id === spot.id && (
            <div style={{
              position: 'absolute',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(253,251,247,0.95)',
              border: '1px solid #E8E5DF',
              borderRadius: 10,
              padding: '10px 14px',
              boxShadow: '0 4px 16px rgba(26,22,20,0.1)',
              whiteSpace: 'nowrap',
              fontSize: 13,
              color: '#5C554C',
              animation: 'fadeInUp 200ms ease-out',
              backdropFilter: 'blur(8px)',
            }}>
              {spot.description}
            </div>
          )}
        </div>
      ))}

      {/* 地图标题 */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 16,
        fontSize: 11,
        color: '#A8A198',
        letterSpacing: '1px',
      }}>
        灵山胜境 · 景区导览图
      </div>

      <style>{`
        @keyframes mapPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InkMap;
