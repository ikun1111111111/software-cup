import React, { useState } from 'react';

export interface StorySpotItem {
  id: string;
  name: string;
  description: string;
}

interface Props {
  spots: StorySpotItem[];
  onSelect: (spotId: string) => void;
}

const StorySpotGrid: React.FC<Props> = ({ spots, onSelect }) => {
  const [errored, setErrored] = useState<Record<string, boolean>>({});

  return (
    <>
      <style>{`
        @keyframes storySpotEnter {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 4,
          width: 'min(1100px, 86vw)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          pointerEvents: 'auto',
        }}
      >
        {spots.map((spot, i) => {
          const thumb = `/image/story/${spot.id}/thumb.jpg`;
          const imgBroken = errored[spot.id];
          return (
            <button
              key={spot.id}
              data-testid={`spot-card-${spot.id}`}
              onClick={() => onSelect(spot.id)}
              style={{
                position: 'relative',
                display: 'block',
                padding: 0,
                border: '1.5px solid rgba(42,37,32,0.12)',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#E8E2D4',
                cursor: 'pointer',
                aspectRatio: '3 / 2',
                boxShadow: '0 6px 20px rgba(60,50,40,0.10)',
                transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease',
                animation: `storySpotEnter 520ms cubic-bezier(0.2,0.8,0.2,1) ${i * 70}ms both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.012)';
                e.currentTarget.style.boxShadow = '0 14px 32px rgba(60,50,40,0.18)';
                e.currentTarget.style.borderColor = 'rgba(200,75,49,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(60,50,40,0.10)';
                e.currentTarget.style.borderColor = 'rgba(42,37,32,0.12)';
              }}
            >
              {!imgBroken && (
                <img
                  src={thumb}
                  alt={spot.name}
                  onError={() => setErrored((m) => ({ ...m, [spot.id]: true }))}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.96,
                  }}
                  draggable={false}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(20,16,12,0) 38%, rgba(20,16,12,0.72) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 12,
                  textAlign: 'left',
                  color: '#F7F2E6',
                }}
              >
                <div
                  style={{
                    fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
                    fontSize: 20,
                    letterSpacing: '0.14em',
                    textShadow: '0 2px 8px rgba(0,0,0,0.55)',
                    marginBottom: 3,
                  }}
                >
                  {spot.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    fontSize: 12.5,
                    letterSpacing: '0.06em',
                    opacity: 0.86,
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {spot.description}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  padding: '2px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: 'rgba(247,242,230,0.92)',
                  background: 'rgba(20,16,12,0.42)',
                  backdropFilter: 'blur(4px)',
                  fontFamily: "'Noto Serif SC', serif",
                }}
              >
                第 {i + 1} 卷
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default StorySpotGrid;
