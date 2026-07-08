import React from 'react';
import type { RouteMapCard as RouteMapCardType } from '../../types/themeCards';

interface Props {
  card: RouteMapCardType;
}

const RouteMapCard: React.FC<Props> = ({ card }) => {
  const { route, spots } = card;
  const color = route.color || 'var(--color-vermilion)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            height: 140,
            borderRadius: 'var(--radius-md)',
            background: `linear-gradient(135deg, #f5f0e8 0%, #e8e0d4 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 14,
            border: '1px dashed var(--border-light)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              backgroundImage: `radial-gradient(circle at 30% 40%, ${color} 2px, transparent 2px),
                radial-gradient(circle at 70% 60%, ${color} 2px, transparent 2px),
                radial-gradient(circle at 50% 80%, ${color} 2px, transparent 2px)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🗺️</div>
            <div>路线地图</div>
          </div>
        </div>

        {route.cover_image && (
          <img
            src={route.cover_image}
            alt={route.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
            }}
          />
        )}
      </div>

      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            fontFamily: 'var(--font-serif)',
            marginBottom: 6,
            color: 'var(--text-primary)',
          }}
        >
          {route.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-primary-bg)',
              color: 'var(--color-primary)',
              fontWeight: 500,
            }}
          >
            {route.route_type}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            预计 {route.duration}
          </span>
        </div>
        {route.description && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 10,
              lineHeight: 1.7,
            }}
          >
            {route.description}
          </div>
        )}
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 'var(--radius-md)',
          background: 'var(--gray-50)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
            fontFamily: 'var(--font-serif)',
          }}
        >
          途经景点
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {spots.map((spot, idx) => (
            <div key={spot.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: `0 0 0 3px rgba(200, 75, 49, 0.1)`,
                }}
              >
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  {spot.name}
                </div>
                {spot.narration && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 4,
                      lineHeight: 1.6,
                    }}
                  >
                    {spot.narration}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteMapCard;
