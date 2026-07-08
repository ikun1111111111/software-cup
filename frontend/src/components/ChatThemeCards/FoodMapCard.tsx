import React, { useState } from 'react';
import type { FoodMapCard as FoodMapCardType } from '../../types/themeCards';

interface Props {
  card: FoodMapCardType;
}

const FoodMapCard: React.FC<Props> = ({ card }) => {
  const [selectedId, setSelectedId] = useState<number | null>(card.pois[0]?.id ?? null);
  const selected = card.pois.find((p) => p.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          height: 130,
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          border: '1px dashed var(--border-light)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            backgroundImage: `radial-gradient(circle at 25% 35%, var(--color-vermilion) 2px, transparent 2px),
              radial-gradient(circle at 75% 55%, var(--color-vermilion) 2px, transparent 2px),
              radial-gradient(circle at 45% 75%, var(--color-vermilion) 2px, transparent 2px)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🍜</div>
          <div>美食地图</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
            ({card.center.lat.toFixed(2)}, {card.center.lng.toFixed(2)})
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 4,
            fontFamily: 'var(--font-serif)',
          }}
        >
          推荐餐厅
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {card.pois.map((poi) => (
            <button
              key={poi.id}
              onClick={() => setSelectedId(poi.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: selectedId === poi.id ? 'var(--color-accent-bg)' : 'var(--gray-50)',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                if (selectedId !== poi.id) {
                  e.currentTarget.style.background = 'var(--gray-100)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedId !== poi.id) {
                  e.currentTarget.style.background = 'var(--gray-50)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  {poi.name}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: selectedId === poi.id ? 'var(--color-accent)' : 'var(--gray-200)',
                    color: selectedId === poi.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  {poi.category}
                </span>
              </div>
              {poi.tags && poi.tags.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {poi.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: selectedId === poi.id ? 'rgba(255,255,255,0.6)' : 'var(--gray-200)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'var(--gray-50)',
            border: '1px solid var(--border-light)',
            animation: 'fadeInUp 250ms ease both',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            {selected.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selected.address && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                📍 {selected.address}
              </div>
            )}
            {selected.business_hours && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                🕐 营业时间：{selected.business_hours}
              </div>
            )}
            {selected.price_level && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                💰 人均：{selected.price_level}
              </div>
            )}
            {selected.phone && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                📞 {selected.phone}
              </div>
            )}
            {selected.intro && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border-light)',
                  lineHeight: 1.6,
                }}
              >
                {selected.intro}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodMapCard;
