import React, { useEffect, useRef, useState } from 'react';
import { Input, Button } from 'antd';
import {
  SendOutlined,
  HistoryOutlined,
  CloseOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import { useTypewriter } from '../../hooks/useTypewriter';
import GalgameChoice, { DialogChoice } from '../Galgame/GalgameChoice';

/* ================================================================
   PoetryDialog — 诗笺风格对话框
   新中式竖版诗笺形态，融入宣纸纹理与水墨动效
   ================================================================ */

interface PoetryDialogProps {
  speakerName?: string;
  text: string;
  isTypingEnabled?: boolean;
  typingSpeed?: number;
  onClickNext?: () => void;
  choices?: DialogChoice[];
  showChoices?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onSend?: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  isMobile?: boolean;
  inputFocused?: boolean;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onToggleHistory?: () => void;
  isHistoryOpen?: boolean;
  isSpeaking?: boolean;
  isStreaming?: boolean;
  voiceInput?: React.ReactNode;
}

const PoetryDialog: React.FC<PoetryDialogProps> = ({
  speakerName = '小景',
  text,
  isTypingEnabled = true,
  typingSpeed = 22,
  onClickNext,
  choices,
  showChoices = false,
  inputValue,
  onInputChange,
  onSend,
  onKeyPress,
  disabled = false,
  isMobile = false,
  inputFocused = false,
  onInputFocus,
  onInputBlur,
  onToggleHistory,
  isHistoryOpen = false,
  isSpeaking = false,
  isStreaming = false,
  voiceInput,
}) => {
  const { displayText, isComplete, skip } = useTypewriter({
    text,
    speed: typingSpeed,
    enabled: isTypingEnabled,
  });

  const [placeholder, setPlaceholder] = useState('向小景施主请教...');
  const inputRef = useRef<HTMLInputElement>(null);

  // 动态 placeholder
  useEffect(() => {
    if (isStreaming) {
      setPlaceholder('小景正在研墨...');
    } else if (isSpeaking) {
      setPlaceholder('小景正在讲解...');
    } else {
      setPlaceholder('向小景施主请教...');
    }
  }, [isStreaming, isSpeaking]);

  const handleClick = () => {
    if (!isComplete) {
      skip();
    } else {
      onClickNext?.();
    }
  };

  const isThinking = !text && !showChoices;

  // 诗笺尺寸
  const width = isMobile ? '92%' : '420px';
  const maxWidth = isMobile ? '92vw' : '28vw';

  return (
    <div
      className="poetry-dialog-enter"
      style={{
        position: 'absolute',
        right: isMobile ? '4%' : '3%',
        bottom: isMobile ? '2%' : '4%',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        width,
        maxWidth,
        maxHeight: isMobile ? '45vh' : '55vh',
        background: `
          linear-gradient(170deg, rgba(253, 250, 245, 0.92) 0%, rgba(248, 244, 238, 0.88) 100%)
        `,
        backdropFilter: 'blur(20px) saturate(130%)',
        WebkitBackdropFilter: 'blur(20px) saturate(130%)',
        border: '1px solid rgba(200, 180, 160, 0.3)',
        borderRadius: '4px 20px 20px 4px',
        boxShadow: `
          0 12px 40px rgba(42, 37, 32, 0.08),
          0 2px 8px rgba(42, 37, 32, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.5)
        `,
        overflow: 'hidden',
      }}
    >
      {/* 宣纸纹理覆盖 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 左侧朱红诗笺线 */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 24,
          bottom: 24,
          width: 2,
          borderRadius: 1,
          background: 'linear-gradient(180deg, transparent, rgba(200, 75, 49, 0.25), rgba(200, 75, 49, 0.35), rgba(200, 75, 49, 0.25), transparent)',
          zIndex: 1,
        }}
      />

      {/* 顶部 —— 竖排标题 + 状态 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: isMobile ? '14px 16px 8px 28px' : '16px 20px 10px 32px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 状态呼吸点 */}
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isSpeaking ? '#2D8B57' : 'rgba(42, 37, 32, 0.2)',
              boxShadow: isSpeaking
                ? '0 0 10px rgba(45, 139, 87, 0.5), 0 0 20px rgba(45, 139, 87, 0.2)'
                : 'none',
              transition: 'all 600ms ease',
              animation: isSpeaking ? 'poetry-breathe 2.5s ease-in-out infinite' : undefined,
            }}
          />
          <div>
            <div
              style={{
                fontSize: isMobile ? 15 : 16,
                fontWeight: 700,
                color: '#2A2520',
                letterSpacing: 2,
                fontFamily: "'KaiTi','STKaiti',serif",
                lineHeight: 1.3,
              }}
            >
              {speakerName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(42, 37, 32, 0.45)',
                letterSpacing: 1,
                fontFamily: "'Noto Serif SC',serif",
                marginTop: 2,
              }}
            >
              {isStreaming ? '研墨中...' : isSpeaking ? '讲解中...' : 'AI 导览人'}
            </div>
          </div>
        </div>

        {onToggleHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHistory();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              background: isHistoryOpen
                ? 'rgba(200, 75, 49, 0.08)'
                : 'transparent',
              border: '1px solid transparent',
              borderRadius: 8,
              color: isHistoryOpen ? '#C84B31' : 'rgba(42, 37, 32, 0.4)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 200ms',
              fontFamily: "'Noto Serif SC',serif",
            }}
          >
            {isHistoryOpen ? <CloseOutlined /> : <HistoryOutlined />}
            <span>{isHistoryOpen ? '收起' : '记录'}</span>
          </button>
        )}
      </div>

      {/* 主文本区域 —— 诗笺正文 */}
      <div
        onClick={handleClick}
        style={{
          flex: showChoices && choices && choices.length > 0 ? '0 0 auto' : 1,
          padding: isMobile ? '0 16px 8px 28px' : '0 20px 10px 32px',
          cursor: !isComplete ? 'pointer' : 'default',
          overflow: 'hidden',
          minHeight: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            fontSize: isMobile ? 15 : 16,
            lineHeight: 1.85,
            color: '#2A2520',
            letterSpacing: '0.4px',
            wordBreak: 'break-word',
            fontFamily: "'Noto Serif SC','Source Han Serif SC',serif",
            textAlign: 'justify',
          }}
        >
          {isThinking ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: 4,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(200, 75, 49, 0.25)',
                    animation: `poetry-thinking-pulse 1.6s ease-in-out infinite ${i * 0.2}s`,
                  }}
                />
              ))}
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(42, 37, 32, 0.45)',
                  marginLeft: 4,
                  fontFamily: "'KaiTi','STKaiti',serif",
                }}
              >
                小景正在研墨...
              </span>
            </div>
          ) : (
            <>
              {displayText}
              {!isComplete && (
                <span
                  style={{
                    animation: 'poetry-cursor-blink 1.2s step-end infinite',
                    marginLeft: 3,
                    color: '#C84B31',
                    fontWeight: 300,
                  }}
                >
                  ▏
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 选择支 —— 诗笺内嵌选项 */}
      {showChoices && isComplete && choices && choices.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? '0 16px 8px 28px' : '0 20px 10px 32px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {choices.map((choice, idx) => (
              <button
                key={choice.id}
                onClick={choice.onClick}
                className="poetry-choice-btn"
                style={{
                  padding: '10px 16px',
                  fontSize: isMobile ? 13 : 14,
                  color: '#2A2520',
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(200, 180, 160, 0.35)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 250ms cubic-bezier(0.22, 1, 0.36, 1)',
                  fontFamily: "'Noto Serif SC','Source Han Serif SC',serif",
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.45)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(200, 75, 49, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(200, 180, 160, 0.35)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* 选项序号印章 */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(200, 75, 49, 0.1)',
                    color: '#C84B31',
                    fontSize: 11,
                    fontWeight: 700,
                    marginRight: 10,
                    flexShrink: 0,
                    fontFamily: "'KaiTi','STKaiti',serif",
                  }}
                >
                  {idx + 1}
                </span>
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 —— 毛笔砚台风格 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 10,
          padding: isMobile ? '10px 14px 14px 28px' : '12px 18px 16px 32px',
          borderTop: '1px solid rgba(200, 180, 160, 0.2)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {voiceInput}

        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            ref={inputRef as any}
            value={inputValue}
            onChange={(e) => onInputChange?.(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              borderRadius: 12,
              height: isMobile ? 40 : 42,
              paddingLeft: 16,
              paddingRight: 16,
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.6)',
              border: inputFocused
                ? '1px solid rgba(200, 75, 49, 0.4)'
                : '1px solid rgba(200, 180, 160, 0.3)',
              color: '#2A2520',
              boxShadow: inputFocused
                ? '0 0 0 3px rgba(200, 75, 49, 0.06), 0 2px 8px rgba(42, 37, 32, 0.04)'
                : 'none',
              transition: 'all 250ms cubic-bezier(0.22, 1, 0.36, 1)',
              fontFamily: "'Noto Serif SC','Source Han Serif SC',serif",
            }}
          />
        </div>

        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSend}
          disabled={disabled || !inputValue?.trim()}
          className="poetry-send-btn"
          style={{
            borderRadius: 12,
            width: isMobile ? 40 : 42,
            height: isMobile ? 40 : 42,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              !inputValue?.trim() || disabled
                ? 'rgba(42, 37, 32, 0.08)'
                : 'linear-gradient(135deg, #C84B31 0%, #D4603D 50%, #C84B31 100%)',
            border: 'none',
            fontSize: 14,
            transition: 'all 250ms cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow:
              !inputValue?.trim() || disabled
                ? 'none'
                : '0 2px 12px rgba(200, 75, 49, 0.25)',
          }}
        />
      </div>

      {/* 右下角卷角装饰 */}
      <div
        style={{
          position: 'absolute',
          right: -1,
          bottom: -1,
          width: 28,
          height: 28,
          background: 'linear-gradient(135deg, transparent 50%, rgba(200, 180, 160, 0.25) 50%)',
          borderRadius: '0 0 0 4px',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @keyframes poetry-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes poetry-thinking-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes poetry-breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); box-shadow: 0 0 10px rgba(45, 139, 87, 0.3); }
          50% { opacity: 1; transform: scale(1.3); box-shadow: 0 0 20px rgba(45, 139, 87, 0.5); }
        }
        .poetry-dialog-enter {
          animation: poetryDialogEnter 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms both;
        }
        @keyframes poetryDialogEnter {
          from { opacity: 0; transform: translateY(30px) translateX(10px); }
          to { opacity: 1; transform: translateY(0) translateX(0); }
        }
        .poetry-choice-btn:hover {
          border-color: rgba(200, 75, 49, 0.45) !important;
        }
        .poetry-send-btn:not(:disabled):hover {
          transform: scale(1.05) !important;
          box-shadow: 0 4px 16px rgba(200, 75, 49, 0.35) !important;
        }
        .poetry-send-btn:not(:disabled):active {
          transform: scale(0.95) !important;
        }
      `}</style>
    </div>
  );
};

export default PoetryDialog;
