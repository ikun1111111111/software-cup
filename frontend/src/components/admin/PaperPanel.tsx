import React from 'react';

export interface PaperPanelProps {
  children: React.ReactNode;
  title?: string;
  withScrollHead?: boolean;
  style?: React.CSSProperties;
}

const PaperPanel: React.FC<PaperPanelProps> = ({
  children,
  title,
  withScrollHead = false,
  style,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.74), rgba(243,239,230,0.94)), var(--texture-paper)',
        borderRadius: withScrollHead ? '0 0 var(--radius-lg) var(--radius-lg)' : 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-medium), inset 0 1px 0 rgba(255,255,255,0.56)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 26,
          height: 26,
          borderTop: '1px solid rgba(201,169,110,0.36)',
          borderRight: '1px solid rgba(201,169,110,0.36)',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          width: 22,
          height: 22,
          borderLeft: '1px solid rgba(106,156,137,0.26)',
          borderBottom: '1px solid rgba(106,156,137,0.26)',
          pointerEvents: 'none',
        }}
      />
      {withScrollHead && (
        <div style={{
          height: 28,
          background: 'linear-gradient(180deg, #C9A96E 0%, #B8945F 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          {/* 卷轴轴头装饰 */}
          <span style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4B87A, #A88A4F)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
          }} />
          {title && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              color: '#FFF',
              fontWeight: 600,
              letterSpacing: 2,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}>
              {title}
            </span>
          )}
          <span style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4B87A, #A88A4F)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
          }} />
        </div>
      )}
      <div style={{ padding: withScrollHead ? '20px 24px 24px' : '24px' }}>
        {!withScrollHead && title && (
          <h3 style={{
            margin: '0 0 16px 0',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 3,
              height: 20,
              backgroundColor: 'var(--vermilion)',
              borderRadius: '0 2px 2px 0',
            }} />
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default PaperPanel;
