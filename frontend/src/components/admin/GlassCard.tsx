import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, style, className }) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        borderRadius: 16,
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-md)',
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;
