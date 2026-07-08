import React, { useState } from 'react';
import { MessageOutlined, CompassOutlined, CloseOutlined } from '@ant-design/icons';

interface InteractionBarProps {
  accentColor: string;
  onContinue: () => void;
  onAsk: (text: string) => void;
  disabled?: boolean;
}

const InteractionBar: React.FC<InteractionBarProps> = ({
  accentColor,
  onContinue,
  onAsk,
  disabled = false,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleAsk = () => {
    if (!inputValue.trim() || disabled) return;
    onAsk(inputValue.trim());
    setInputValue('');
    setShowInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAsk();
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '4%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'auto',
        animation: 'barFloatUp 400ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {!showInput ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={onContinue}
            disabled={disabled}
            style={{
              padding: '12px 28px',
              background: disabled ? 'rgba(253, 251, 247, 0.4)' : 'rgba(253, 251, 247, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1.5px solid ${disabled ? 'rgba(180, 160, 130, 0.15)' : 'rgba(180, 160, 130, 0.3)'}`,
              borderRadius: 12,
              fontFamily: "'KaiTi','STKaiti',serif",
              fontSize: 15,
              color: disabled ? 'rgba(42, 37, 32, 0.35)' : '#2A2520',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.5)';
              e.currentTarget.style.background = 'rgba(200, 75, 49, 0.08)';
            }}
            onMouseLeave={(e) => {
              if (disabled) return;
              e.currentTarget.style.borderColor = 'rgba(180, 160, 130, 0.3)';
              e.currentTarget.style.background = 'rgba(253, 251, 247, 0.72)';
            }}
          >
            <CompassOutlined />
            继续探索
          </button>
          <button
            onClick={() => !disabled && setShowInput(true)}
            disabled={disabled}
            style={{
              padding: '12px 28px',
              background: disabled ? 'rgba(253, 251, 247, 0.4)' : 'rgba(253, 251, 247, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1.5px solid ${disabled ? 'rgba(180, 160, 130, 0.15)' : `${accentColor}50`}`,
              borderRadius: 12,
              fontFamily: "'KaiTi','STKaiti',serif",
              fontSize: 15,
              color: disabled ? 'rgba(42, 37, 32, 0.35)' : accentColor,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              e.currentTarget.style.background = `${accentColor}15`;
            }}
            onMouseLeave={(e) => {
              if (disabled) return;
              e.currentTarget.style.background = 'rgba(253, 251, 247, 0.72)';
            }}
          >
            <MessageOutlined />
            问小景
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            background: 'rgba(253, 251, 247, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: 14,
            border: '1.5px solid rgba(180, 160, 130, 0.25)',
            animation: 'barFloatUp 300ms ease',
          }}
        >
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="想对小景说什么..."
            disabled={disabled}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: disabled ? 'rgba(42, 37, 32, 0.35)' : '#2A2520',
              fontFamily: "'KaiTi','STKaiti',serif",
              width: 260,
            }}
          />
          <button
            onClick={handleAsk}
            disabled={disabled}
            style={{
              background: disabled ? 'rgba(42, 37, 32, 0.12)' : `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              padding: '6px 14px',
              fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            发送
          </button>
          <button
            onClick={() => setShowInput(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8A8278',
              padding: 4,
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      )}

      <style>{`
        @keyframes barFloatUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default InteractionBar;
