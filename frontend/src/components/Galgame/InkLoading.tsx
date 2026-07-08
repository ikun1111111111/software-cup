import React from 'react';

interface InkLoadingProps {
  label?: string;
}

const InkLoading: React.FC<InkLoadingProps> = ({ label = '待她思量…' }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      color: 'rgba(42,37,32,0.38)',
      fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
    }}
  >
    <div
      style={{
        position: 'relative',
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          border: '1px solid rgba(106,156,137,0.18)',
          animation: 'inkRipple 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          borderTop: '1.5px solid rgba(106,156,137,0.42)',
          borderRight: '1.5px solid transparent',
          borderBottom: '1.5px solid rgba(106,156,137,0.10)',
          borderLeft: '1.5px solid transparent',
          animation: 'inkArcSpin 2.6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          borderTop: '1px solid transparent',
          borderRight: '1px solid rgba(42,77,110,0.22)',
          borderBottom: '1px solid transparent',
          borderLeft: '1px solid rgba(42,77,110,0.16)',
          animation: 'inkArcSpin 3.4s cubic-bezier(0.22, 1, 0.36, 1) infinite reverse',
        }}
      />
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#6A9C89',
          boxShadow: '0 0 12px rgba(106,156,137,0.32)',
          animation: 'inkPulse 1.8s ease-in-out infinite',
        }}
      />
    </div>
    <span
      style={{
        writingMode: 'vertical-rl',
        letterSpacing: '0.18em',
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <style>{`
      @keyframes inkRipple {
        0% { transform: scale(0.3); opacity: 0.68; }
        100% { transform: scale(1.85); opacity: 0; }
      }
      @keyframes inkArcSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes inkPulse {
        0%, 100% { transform: scale(0.84); opacity: 0.65; }
        50% { transform: scale(1.18); opacity: 1; }
      }
    `}</style>
  </div>
);

export default InkLoading;
