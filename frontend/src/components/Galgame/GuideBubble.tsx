import React from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';

interface GuideBubbleProps {
  text: string;
  isTyping?: boolean;
  loading?: boolean;
  typingSpeed?: number;
  visible?: boolean;
  speakerName?: string;
  onSkip?: () => void;
  style?: React.CSSProperties;
  variant?: 'default' | 'comic';
  tailSide?: 'left' | 'right';
}

const GuideBubble: React.FC<GuideBubbleProps> = ({
  text,
  isTyping = true,
  loading = false,
  typingSpeed = 22,
  visible = true,
  speakerName = '小景',
  onSkip,
  style,
  variant = 'default',
  tailSide = 'left',
}) => {
  const { displayText, isComplete } = useTypewriter({
    text,
    speed: typingSpeed,
    enabled: isTyping && visible,
  });

  if (!visible) return null;

  // 跳过时不等 useTypewriter effect，直接显示完整文字，消除中间帧跳变
  const finalText = loading ? '' : isTyping ? displayText : text;
  const finalComplete = loading ? false : !isTyping || isComplete;
  const isComic = variant === 'comic';

  return (
    <div
      className="guide-bubble-enter"
      style={{
        position: 'absolute',
        maxWidth: 320,
        minWidth: 200,
        zIndex: 10,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          background: isComic ? 'rgba(255, 253, 247, 0.96)' : 'rgba(253, 251, 247, 0.92)',
          backdropFilter: isComic ? 'blur(8px)' : 'blur(12px)',
          WebkitBackdropFilter: isComic ? 'blur(8px)' : 'blur(12px)',
          border: isComic ? '2px solid rgba(42, 37, 32, 0.20)' : '1px solid rgba(42, 37, 32, 0.08)',
          borderRadius: isComic
            ? tailSide === 'right'
              ? '24px 24px 8px 24px'
              : '24px 24px 24px 8px'
            : '14px 14px 14px 4px',
          padding: isComic ? '13px 17px 14px' : '14px 18px',
          boxShadow: isComic
            ? '0 10px 0 rgba(42, 37, 32, 0.04), 0 16px 34px rgba(42, 37, 32, 0.12), inset 0 1px 0 rgba(255,255,255,0.72)'
            : '0 8px 32px rgba(42, 37, 32, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          position: 'relative',
        }}
      >
        {/* 跳过按钮 */}
        {onSkip && isTyping && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              padding: '3px 10px',
              background: 'rgba(200, 75, 49, 0.08)',
              border: '1px solid rgba(200, 75, 49, 0.2)',
              borderRadius: '6px',
              fontSize: 12,
              fontWeight: 500,
              color: '#C84B31',
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'all 200ms ease',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(200, 75, 49, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(200, 75, 49, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.2)';
            }}
          >
            跳过 ▶▶
          </button>
        )}
        <div
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            background: isComic ? 'rgba(42, 37, 32, 0.88)' : 'linear-gradient(90deg, #C84B31, #E85D3A)',
            borderRadius: isComic ? '999px' : '4px',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}
        >
          {speakerName}
        </div>

        <div
          style={{
            fontSize: 15,
            lineHeight: isComic ? 1.65 : 1.7,
            color: '#2A2520',
            letterSpacing: '0.2px',
            minHeight: 24,
          }}
        >
          {loading ? (
            <span
              style={{
                color: 'rgba(42, 37, 32, 0.4)',
                letterSpacing: 2,
              }}
            >
              <span style={{ animation: 'loading-dot 1.4s ease-in-out infinite', display: 'inline-block' }}>.</span>
              <span style={{ animation: 'loading-dot 1.4s ease-in-out 0.2s infinite', display: 'inline-block' }}>.</span>
              <span style={{ animation: 'loading-dot 1.4s ease-in-out 0.4s infinite', display: 'inline-block' }}>.</span>
            </span>
          ) : (
            <>
              {finalText}
              {!finalComplete && (
                <span
                  style={{
                    animation: 'blink-cursor 1s step-end infinite',
                    marginLeft: 2,
                    color: '#C84B31',
                  }}
                >
                  ▋
                </span>
              )}
              {finalComplete && (
                <span
                  style={{
                    animation: 'dialog-bounce 1.6s ease-in-out infinite',
                    marginLeft: 4,
                    color: 'rgba(42, 37, 32, 0.25)',
                    fontSize: 12,
                  }}
                >
                  ▼
                </span>
              )}
            </>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            left: tailSide === 'left' ? -6 : 'auto',
            right: tailSide === 'right' ? -7 : 'auto',
            top: isComic ? '42%' : 28,
            width: 0,
            height: 0,
            borderTop: isComic ? '9px solid transparent' : '6px solid transparent',
            borderBottom: isComic ? '9px solid transparent' : '6px solid transparent',
            borderRight: tailSide === 'left' ? `${isComic ? 8 : 6}px solid rgba(253, 251, 247, 0.92)` : undefined,
            borderLeft: tailSide === 'right' ? `${isComic ? 8 : 6}px solid rgba(255, 253, 247, 0.96)` : undefined,
            filter: isComic ? 'drop-shadow(2px 1px 0 rgba(42,37,32,0.16))' : undefined,
          }}
        />
      </div>

      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes dialog-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(3px); opacity: 0.7; }
        }
        @keyframes loading-dot {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        .guide-bubble-enter {
          animation: bubbleEnter 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes bubbleEnter {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GuideBubble;
