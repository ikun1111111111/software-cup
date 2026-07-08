import React from 'react';

export interface DataVMetric {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  hint?: string;
  tone?: 'jade' | 'vermilion' | 'gold' | 'ink';
}

interface DataVStageProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  metrics: DataVMetric[];
  actions?: React.ReactNode;
  visualLabel?: string;
}

const toneMap: Record<NonNullable<DataVMetric['tone']>, { color: string; bg: string; border: string }> = {
  jade: {
    color: '#6A9C89',
    bg: 'rgba(106,156,137,0.12)',
    border: 'rgba(106,156,137,0.36)',
  },
  vermilion: {
    color: '#C84B31',
    bg: 'rgba(200,75,49,0.10)',
    border: 'rgba(200,75,49,0.30)',
  },
  gold: {
    color: '#C9A96E',
    bg: 'rgba(201,169,110,0.13)',
    border: 'rgba(201,169,110,0.34)',
  },
  ink: {
    color: '#2A2520',
    bg: 'rgba(42,37,32,0.08)',
    border: 'rgba(42,37,32,0.16)',
  },
};

const DataVStage: React.FC<DataVStageProps> = ({
  eyebrow,
  title,
  subtitle,
  metrics,
  actions,
  visualLabel = '灵山数据地形',
}) => {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(42,37,32,0.10)',
        borderRadius: 28,
        minHeight: 250,
        marginBottom: 24,
        background:
          'linear-gradient(135deg, rgba(42,37,32,0.96) 0%, rgba(27,77,62,0.93) 48%, rgba(243,239,230,0.80) 100%)',
        boxShadow: '0 24px 70px rgba(42,37,32,0.18)',
        color: '#F7F5F0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.42,
          backgroundImage:
            'linear-gradient(rgba(247,245,240,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.08) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(90deg, rgba(0,0,0,0.9), rgba(0,0,0,0.2))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -120,
          top: -100,
          width: 430,
          height: 430,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(201,169,110,0.26) 0%, rgba(106,156,137,0.14) 34%, transparent 64%)',
          filter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)',
          gap: 28,
          padding: '30px 34px 28px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              border: '1px solid rgba(201,169,110,0.34)',
              borderRadius: 999,
              color: '#D8C087',
              background: 'rgba(247,245,240,0.06)',
              fontSize: 12,
              letterSpacing: '0.18em',
              marginBottom: 18,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C84B31' }} />
            {eyebrow}
          </div>
          <h1
            style={{
              margin: 0,
              maxWidth: 620,
              fontFamily: 'var(--font-serif)',
              fontSize: 34,
              lineHeight: 1.16,
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: '14px 0 24px',
              maxWidth: 640,
              color: 'rgba(247,245,240,0.70)',
              lineHeight: 1.8,
              fontSize: 14,
            }}
          >
            {subtitle}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {actions}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            minHeight: 190,
            display: 'grid',
            gridTemplateRows: '1fr auto',
            gap: 12,
          }}
        >
          <div
            aria-label={visualLabel}
            style={{
              position: 'relative',
              minHeight: 135,
              perspective: 760,
            }}
          >
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  right: 30 + index * 78,
                  top: index === 1 ? 8 : 28 + index * 10,
                  width: 180,
                  height: 116,
                  borderRadius: 22,
                  transform: `rotateY(${-20 + index * 12}deg) rotateZ(${-5 + index * 4}deg)`,
                  transformOrigin: 'center',
                  background:
                    index === 1
                      ? 'linear-gradient(135deg, rgba(247,245,240,0.92), rgba(201,213,209,0.78))'
                      : 'linear-gradient(135deg, rgba(16,24,22,0.88), rgba(74,124,111,0.58))',
                  border: '1px solid rgba(247,245,240,0.22)',
                  boxShadow: '0 16px 42px rgba(0,0,0,0.24)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                      'radial-gradient(circle at 30% 30%, rgba(200,75,49,0.70) 0 4px, transparent 16px), radial-gradient(circle at 62% 58%, rgba(201,169,110,0.62) 0 5px, transparent 20px), radial-gradient(circle at 76% 22%, rgba(106,156,137,0.70) 0 4px, transparent 18px), linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
                    backgroundSize: '100% 100%, 100% 100%, 100% 100%, 24px 24px, 24px 24px',
                    opacity: index === 1 ? 0.9 : 0.72,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    bottom: 14,
                    color: index === 1 ? '#2A2520' : '#F7F5F0',
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    opacity: 0.74,
                  }}
                >
                  LINGSHAN · DATA
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))`,
              gap: 10,
            }}
          >
            {metrics.map((metric) => {
              const tone = toneMap[metric.tone ?? 'jade'];
              return (
                <div
                  key={metric.label}
                  style={{
                    minHeight: 76,
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: `1px solid ${tone.border}`,
                    background: 'rgba(247,245,240,0.90)',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.12)',
                    color: '#2A2520',
                  }}
                >
                  <div style={{ color: 'rgba(42,37,32,0.52)', fontSize: 11, marginBottom: 5 }}>
                    {metric.label}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                      color: tone.color,
                      fontFamily: 'var(--font-serif)',
                      fontSize: 23,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {metric.value}
                    {metric.suffix && <span style={{ fontSize: 11, color: 'rgba(42,37,32,0.45)' }}>{metric.suffix}</span>}
                  </div>
                  {metric.hint && (
                    <div style={{ marginTop: 6, color: 'rgba(42,37,32,0.42)', fontSize: 11 }}>
                      {metric.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataVStage;
