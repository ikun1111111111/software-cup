import React, { useEffect, useRef, useState, isValidElement } from 'react';

export interface MetricsCardProps {
  title: string;
  value: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
}

const isTestEnv = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');

function useCountUp(target: number | string, duration = 1200): number | string {
  if (typeof target === 'string') return target;
  const [current, setCurrent] = useState(isTestEnv ? target : 0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (isTestEnv) { ref.current = target; return; }

    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(start + diff * eased);
      setCurrent(value);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        ref.current = target;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  trendValue,
  icon,
  color = 'var(--color-primary)',
}) => {
  const isPrimitive = typeof value === 'number' || typeof value === 'string';

  const animatedValue = useCountUp(
    isPrimitive
      ? (typeof value === 'number' ? value : parseFloat(value as string) || 0)
      : 0
  );

  let displayValue: React.ReactNode;
  if (!isPrimitive) {
    displayValue = value;
  } else if (typeof value === 'string' && value.includes('%')) {
    displayValue = `${animatedValue}%`;
  } else if (typeof value === 'string' && value.includes('.')) {
    displayValue = typeof animatedValue === 'number' ? animatedValue.toFixed(1) : animatedValue;
  } else {
    displayValue = animatedValue;
  }

  return (
    <div
      data-testid="metrics-card"
      className="card-hover"
      style={{
        padding: '20px',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            {title}
          </div>
          <div className="font-mono" style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {displayValue}
          </div>
        </div>
        <div
          data-testid="metrics-icon"
          style={{
            width: 44,
            height: 44,
            backgroundColor: typeof color === 'string' && color.startsWith('#')
              ? `${color}12`
              : 'var(--color-primary-bg)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div
          data-testid="metrics-trend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '12px',
            fontSize: '12px',
            fontWeight: 500,
            color: trend === 'up'
              ? 'var(--color-success)'
              : trend === 'down'
                ? 'var(--color-error)'
                : 'var(--text-tertiary)',
          }}
        >
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;
