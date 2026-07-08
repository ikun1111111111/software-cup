import React from 'react';

export interface DialogChoice {
  id: string;
  text: string;
  icon?: React.ReactNode;
  accentColor?: string;
  onClick: () => void;
}

interface GalgameChoiceProps {
  choices: DialogChoice[];
  visible?: boolean;
  isMobile?: boolean;
  layout?: 'list' | 'grid' | 'card';
  compact?: boolean;
  groupLabel?: string;
}

const GalgameChoice: React.FC<GalgameChoiceProps> = ({
  choices,
  visible = true,
  isMobile = false,
  layout = 'list',
  compact = false,
  groupLabel,
}) => {
  if (!visible || choices.length === 0) return null;

  const isGrid = layout === 'grid';
  const isCard = layout === 'card';

  return (
    <div
      style={{
        display: isCard ? 'grid' : 'flex',
        gridTemplateColumns: isCard ? (isMobile ? '1fr' : '1fr 1fr') : undefined,
        flexDirection: isGrid ? 'row' : 'column',
        flexWrap: isGrid ? 'wrap' : 'nowrap',
        gap: isCard ? '10px' : compact ? '4px' : isMobile ? '4px' : '5px',
        padding: compact ? '2px 0 4px' : isMobile ? '4px 14px 8px' : '6px 24px 8px',
        animation: 'choiceFadeIn 300ms ease-out',
      }}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          onClick={choice.onClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: isCard ? 'column' : 'row',
            gap: '8px',
            width: isGrid ? 'calc(50% - 2.5px)' : '100%',
            minHeight: isCard ? 74 : undefined,
            padding: isCard ? '14px 16px' : compact ? '5px 10px' : isMobile ? '7px 12px' : '8px 14px',
            background: isCard ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)',
            border: isCard ? '1px solid rgba(42, 37, 32, 0.06)' : '1.5px solid rgba(42, 37, 32, 0.08)',
            borderRadius: isCard ? '14px' : compact ? '6px' : '8px',
            color: '#2A2520',
            fontSize: compact ? '12px' : isMobile ? '12px' : '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            textAlign: 'left',
            letterSpacing: '0.2px',
            backdropFilter: 'blur(4px)',
            boxShadow: isCard ? '0 4px 16px rgba(42,37,32,0.03)' : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = choice.accentColor
              ? `${choice.accentColor}18`
              : isCard ? 'rgba(255,255,255,0.86)' : 'rgba(200, 75, 49, 0.12)';
            e.currentTarget.style.borderColor = choice.accentColor
              ? `${choice.accentColor}50`
              : isCard ? 'rgba(106,156,137,0.25)' : 'rgba(200, 75, 49, 0.4)';
            e.currentTarget.style.transform = isCard || isGrid ? 'translateY(-2px)' : compact ? 'translateX(4px)' : 'translateX(6px)';
            if (isCard) e.currentTarget.style.boxShadow = '0 10px 26px rgba(42,37,32,0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isCard ? 'rgba(255,255,255,0.7)' : 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.borderColor = isCard ? 'rgba(42,37,32,0.06)' : 'rgba(42, 37, 32, 0.08)';
            e.currentTarget.style.transform = 'translateX(0) translateY(0)';
            if (isCard) e.currentTarget.style.boxShadow = '0 4px 16px rgba(42,37,32,0.03)';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            {choice.icon && (
              <span style={{ fontSize: isCard ? '18px' : '16px', flexShrink: 0, opacity: 0.86 }}>
                {choice.icon}
              </span>
            )}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isCard ? 'normal' : 'nowrap',
                lineHeight: isCard ? 1.45 : undefined,
              }}
            >
              {choice.text}
            </span>
            {!isCard && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  opacity: 0.35,
                  fontWeight: 300,
                  color: '#2A2520',
                }}
              >
                ▸
              </span>
            )}
          </span>
          {isCard && groupLabel && (
            <span
              style={{
                alignSelf: 'flex-start',
                marginLeft: choice.icon ? 26 : 0,
                padding: '2px 7px',
                borderRadius: 999,
                fontSize: 11,
                color: 'rgba(106,156,137,0.88)',
                background: 'rgba(106,156,137,0.08)',
                fontFamily: "var(--font-calligraphy), 'KaiTi', serif",
              }}
            >
              {groupLabel}
            </span>
          )}
        </button>
      ))}
      <style>{`
        @keyframes choiceFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GalgameChoice;
