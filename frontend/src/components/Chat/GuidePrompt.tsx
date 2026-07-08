import React from 'react';

interface GuidePromptProps {
  visible?: boolean;
  text?: string;
}

const GuidePrompt: React.FC<GuidePromptProps> = ({
  visible = true,
  text = '试着问我关于灵山的任何问题 ✨',
}) => {
  if (!visible) return null;

  return (
    <div
      className="guide-prompt-enter"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'min(610px, calc(58vh + 56px))',
        transform: 'translateX(-50%)',
        zIndex: 109,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.34)',
        border: '1px solid rgba(106,156,137,0.10)',
        color: 'rgba(42,37,32,0.42)',
        fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
        fontSize: 14,
        letterSpacing: '0.08em',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
      <style>{`
        .guide-prompt-enter {
          animation: guidePromptFloat 3.6s ease-in-out infinite, guidePromptFade 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes guidePromptFade {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes guidePromptFloat {
          0%, 100% { margin-bottom: 0; }
          50% { margin-bottom: 6px; }
        }
      `}</style>
    </div>
  );
};

export default GuidePrompt;
