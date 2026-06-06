import React from 'react';

export interface SealCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
  color?: 'vermilion' | 'gold' | 'ink';
  onClick?: () => void;
}

const SealCard: React.FC<SealCardProps> = ({
  children,
  className = '',
  style,
  size = 'md',
  color = 'ink',
  onClick,
}) => {
  const sizeMap = {
    sm: { padding: '12px 16px', radius: 'var(--radius-sm)' },
    md: { padding: '20px 24px', radius: 'var(--radius-md)' },
    lg: { padding: '28px 32px', radius: 'var(--radius-lg)' },
  };

  const colorMap = {
    vermilion: { border: 'var(--vermilion)', bg: 'rgba(200, 75, 49, 0.04)' },
    gold: { border: 'var(--gold-leaf)', bg: 'rgba(201, 169, 110, 0.06)' },
    ink: { border: 'var(--border-ink)', bg: 'var(--bg-panel)' },
  };

  const s = sizeMap[size];
  const c = colorMap[color];

  return (
    <div
      className={`corner-fold ${className}`}
      onClick={onClick}
      style={{
        padding: s.padding,
        borderRadius: s.radius,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: 'var(--shadow-soft)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(0.98)';
          e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(42,37,32,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
      }}
    >
      {children}
    </div>
  );
};

export default SealCard;
