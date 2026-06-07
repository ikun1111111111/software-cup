import React, { type ButtonHTMLAttributes } from 'react';

/**
 * 印章按钮 — 主操作按钮
 * 规范文档 3.3 节
 */

interface SealButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

const SealButton: React.FC<SealButtonProps> = ({
  variant = 'filled',
  size = 'md',
  icon,
  children,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '6px 16px', fontSize: 13, minHeight: 36 },
    md: { padding: '10px 24px', fontSize: 15, minHeight: 44 },
    lg: { padding: '14px 32px', fontSize: 17, minHeight: 52 },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    fontFamily: 'inherit',
    ...sizeStyles[size],
    ...style,
  };

  const filledStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(200, 75, 49, 0.25)',
  };

  const outlineStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'transparent',
    color: 'var(--gray-700)',
    border: '1.5px solid var(--gray-300)',
  };

  return (
    <button
      style={variant === 'filled' ? filledStyle : outlineStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (variant === 'filled') {
          el.style.transform = 'translateY(-1px)';
          el.style.boxShadow = '0 4px 16px rgba(200, 75, 49, 0.35)';
        } else {
          el.style.borderColor = 'var(--color-primary)';
          el.style.color = 'var(--color-primary)';
          el.style.background = 'var(--color-primary-bg)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (variant === 'filled') {
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = '0 2px 8px rgba(200, 75, 49, 0.25)';
        } else {
          el.style.borderColor = 'var(--gray-300)';
          el.style.color = 'var(--gray-700)';
          el.style.background = 'transparent';
        }
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export default SealButton;
