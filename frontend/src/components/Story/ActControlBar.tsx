import React from 'react';
import type { StoryAct } from '../../api/story';

interface Props {
  acts: StoryAct[];
  currentIndex: number;
  onReplay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

const ActControlBar: React.FC<Props> = ({ acts, currentIndex, onReplay, onPrev, onNext, onExit }) => {
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= acts.length - 1;
  const current = acts[currentIndex];

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '10px 18px',
        background: 'rgba(20, 18, 14, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        {acts.map((act, i) => (
          <span
            key={act.id}
            title={act.title}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: i < currentIndex
                ? 'rgba(255,255,255,0.55)'
                : i === currentIndex
                  ? '#f5e6c8'
                  : 'rgba(255,255,255,0.18)',
              boxShadow: i === currentIndex ? '0 0 8px rgba(245,230,200,0.7)' : 'none',
              transition: 'all 240ms ease',
            }}
          />
        ))}
      </div>

      <div
        style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 14,
          color: 'rgba(255,250,235,0.92)',
          letterSpacing: '0.1em',
          minWidth: 130,
          textAlign: 'center',
        }}
      >
        {current?.title} · 第 {currentIndex + 1}/{acts.length} 幕
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <CtrlButton onClick={onReplay} title="重听">⟲ 重听</CtrlButton>
        <CtrlButton onClick={onPrev} disabled={isFirst} title="上一幕">‹ 上一幕</CtrlButton>
        {isLast ? (
          <CtrlButton onClick={onExit} primary title="返回景点">返回景点</CtrlButton>
        ) : (
          <CtrlButton onClick={onNext} primary title="下一幕">下一幕 ›</CtrlButton>
        )}
      </div>
    </div>
  );
};

const CtrlButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, primary, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      padding: '5px 11px',
      fontSize: 12,
      fontFamily: "'Noto Serif SC', serif",
      color: disabled
        ? 'rgba(255,255,255,0.28)'
        : primary
          ? '#1a1610'
          : 'rgba(255,250,235,0.85)',
      background: disabled
        ? 'transparent'
        : primary
          ? 'linear-gradient(180deg,#f5e6c8,#d8b878)'
          : 'rgba(255,255,255,0.08)',
      border: primary
        ? '1px solid rgba(245,230,200,0.6)'
        : '1px solid rgba(255,255,255,0.18)',
      borderRadius: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 200ms ease',
      letterSpacing: '0.05em',
    }}
  >
    {children}
  </button>
);

export default ActControlBar;
