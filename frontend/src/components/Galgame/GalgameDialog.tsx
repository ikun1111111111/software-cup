import React from 'react';
import { Input, Button } from 'antd';
import {
  SendOutlined,
  HistoryOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTypewriter } from '../../hooks/useTypewriter';
import { renderSmartContent } from '../../utils/chatTextRenderer';
import GalgameChoice, { DialogChoice } from './GalgameChoice';
import InkLoading from './InkLoading';

export interface ChoiceGroup {
  label: string;
  items: DialogChoice[];
}

type SpeakerStatus = 'listening' | 'thinking' | 'speaking';

interface GalgameDialogProps {
  speakerName?: string;
  text: string;
  isTypingEnabled?: boolean;
  typingSpeed?: number;
  choices?: DialogChoice[];
  choiceGroups?: ChoiceGroup[];
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
  /** If provided, displayed verbatim (bypasses typewriter). Useful for audio-synced text. */
  syncedText?: string;
  /** If provided, only the first N characters of `text` are shown. Takes precedence over typewriter and syncedText. */
  visibleCharCount?: number;
  voiceInput?: React.ReactNode;
  choiceLayout?: 'list' | 'grid';
  compact?: boolean;
  variant?: 'standard' | 'zen';
  speakerStatus?: SpeakerStatus;
  inputPlaceholder?: string;
  width?: string | number;
  maxWidth?: string | number;
  bottom?: number;
  minHeight?: string | number;
  maxHeight?: string | number;
}

const GalgameDialog: React.FC<GalgameDialogProps> = ({
  speakerName = '小景',
  text,
  isTypingEnabled = true,
  typingSpeed = 22,
  choices,
  choiceGroups,
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
  syncedText,
  visibleCharCount,
  voiceInput,
  choiceLayout = 'list',
  compact = false,
  variant = 'standard',
  speakerStatus,
  inputPlaceholder = '输入你想说的...',
  width: widthProp,
  maxWidth: maxWidthProp,
  bottom: bottomProp,
  minHeight: minHeightProp,
  maxHeight: maxHeightProp,
}) => {
  const typewriter = useTypewriter({
    text,
    speed: typingSpeed,
    enabled: isTypingEnabled,
  });

  let displayText = typewriter.displayText;
  let isComplete = typewriter.isComplete;
  if (visibleCharCount !== undefined) {
    displayText = text.slice(0, visibleCharCount);
    isComplete = visibleCharCount >= text.length;
  } else if (syncedText !== undefined) {
    displayText = syncedText;
    isComplete = true;
  }

  const skip = typewriter.skip;

  const isZen = variant === 'zen';

  const handleClick = () => {
    if (!isComplete) {
      skip();
    }
  };

  const isThinking = !text && !showChoices;
  const resolvedStatus: SpeakerStatus =
    speakerStatus ?? (isThinking ? 'thinking' : isSpeaking ? 'speaking' : 'listening');
  const statusMeta: Record<SpeakerStatus, { label: string; color: string; bg: string; dot: string }> = {
    listening: {
      label: '聆听中',
      color: '#6A9C89',
      bg: 'rgba(106,156,137,0.12)',
      dot: '#6A9C89',
    },
    thinking: {
      label: '思考中',
      color: '#2A4D6E',
      bg: 'rgba(42,77,110,0.08)',
      dot: '#2A4D6E',
    },
    speaking: {
      label: '讲解中',
      color: '#C8A951',
      bg: 'rgba(200,168,81,0.12)',
      dot: '#C8A951',
    },
  };
  const currentStatus = statusMeta[resolvedStatus];

  /* ================================================================
     Compact 模式 —— 「浮舟控制台」
     路线导览专用：非对称左下角、侧签形态、极简 HUD
     ================================================================ */
  if (compact && !isMobile) {
    return (
      <div
        className="animate-compact-enter"
        style={{
          position: 'absolute',
          left: '2.5%',
          bottom: '2.5%',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          width: '340px',
          maxWidth: '40vw',
          background:
            'linear-gradient(135deg, rgba(253,251,247,0.82) 0%, rgba(248,246,242,0.92) 100%)',
          backdropFilter: 'blur(22px) saturate(135%)',
          WebkitBackdropFilter: 'blur(22px) saturate(135%)',
          border: '1px solid rgba(255,255,255,0.45)',
          borderLeft: 'none',
          borderRadius: '0 18px 18px 0',
          boxShadow:
            '6px 6px 28px rgba(42,37,32,0.10), inset 0 1px 0 rgba(255,255,255,0.35)',
          overflow: 'hidden',
          maxHeight: '32vh',
        }}
      >
        {/* 左侧朱红锚线 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '12%',
            bottom: '12%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'linear-gradient(180deg, #C84B31, #E85D3A, #C84B31)',
            opacity: 0.85,
          }}
        />

        {/* 顶部 —— 状态微标 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px 6px 18px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#2D8B57',
              boxShadow: '0 0 8px rgba(45,139,87,0.45)',
              animation: 'breathe-glow 2.4s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#6A6258',
              letterSpacing: '0.8px',
              fontFamily: "'KaiTi','STKaiti',serif",
            }}
          >
            导览中 · {speakerName}
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                'linear-gradient(90deg, rgba(200,75,49,0.20), transparent)',
              marginLeft: 4,
            }}
          />
        </div>

        {/* 文本区（仅在有时显示） */}
        {(text || isThinking) && (
          <div
            onClick={handleClick}
            style={{
              flex: showChoices && choices && choices.length > 0 ? '0 0 auto' : 1,
              padding: '0 16px 6px 18px',
              cursor: !isComplete ? 'pointer' : 'default',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: '#2A2520',
                letterSpacing: '0.2px',
                wordBreak: 'break-word',
              }}
            >
              {isThinking ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingTop: 2,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(42,37,32,0.22)',
                        animation: `thinking-pulse 1.4s ease-in-out infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                  <span
                    style={{
                      fontSize: 12,
                      color: 'rgba(42,37,32,0.45)',
                      marginLeft: 2,
                    }}
                  >
                    思考中…
                  </span>
                </div>
              ) : (
                <>
                  {displayText}
                  {!isComplete && (
                    <span
                      style={{
                        animation: 'blink-cursor 1s step-end infinite',
                        marginLeft: 3,
                        color: '#C84B31',
                      }}
                    >
                      ▋
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 选择支 */}
        {showChoices && isComplete && choices && choices.length > 0 && (
          <div
            style={{
              maxHeight: 110,
              overflowY: 'auto',
              flexShrink: 0,
              padding: '0 14px 6px 16px',
            }}
          >
            <GalgameChoice
              choices={choices || []}
              visible={showChoices && isComplete}
              isMobile={false}
              layout="list"
              compact
            />
          </div>
        )}

        {/* 极简输入条 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px 10px 16px',
            borderTop: '1px solid rgba(42,37,32,0.05)',
            flexShrink: 0,
          }}
        >
          {voiceInput}
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              placeholder="想问什么…"
              disabled={disabled}
              style={{
                width: '100%',
                borderRadius: 10,
                height: 34,
                paddingLeft: 12,
                paddingRight: 12,
                fontSize: 13,
                background: 'rgba(255,255,255,0.55)',
                border: inputFocused
                  ? '1px solid rgba(200,75,49,0.45)'
                  : '1px solid rgba(42,37,32,0.08)',
                color: '#2A2520',
                boxShadow: inputFocused
                  ? '0 0 0 3px rgba(200,75,49,0.08)'
                  : 'none',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onSend}
            disabled={disabled || !inputValue?.trim()}
            style={{
              borderRadius: 10,
              width: 34,
              height: 34,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                !inputValue?.trim() || disabled
                  ? 'rgba(42,37,32,0.08)'
                  : 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
              border: 'none',
              fontSize: 13,
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <style>{`
          @keyframes blink-cursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes thinking-pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1); }
          }
          @keyframes breathe-glow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.25); }
          }
          .animate-compact-enter {
            animation: compactEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) 200ms both;
          }
          @keyframes compactEnter {
            from { opacity: 0; transform: translateX(-28px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ================================================================
     标准模式 —— 底部居中 Galgame 对话框
     ================================================================ */
  const width = widthProp ?? (isZen ? (isMobile ? '92%' : '640px') : (isMobile ? '94%' : '720px'));
  const maxWidth = maxWidthProp ?? (isZen ? '92vw' : '60vw');
  const bottom = bottomProp ?? (isZen ? 40 : 0);
  const borderRadius = isZen ? '20px' : '20px 20px 0 0';
  const background = isZen
    ? 'rgba(255, 255, 255, 0.62)'
    : 'linear-gradient(180deg, rgba(253, 251, 247, 0.82) 0%, rgba(248, 246, 242, 0.94) 100%)';
  const boxShadow = isZen
    ? '0 -8px 40px rgba(42,37,32,0.06), 0 0 0 1px rgba(106,156,137,0.08)'
    : '0 -8px 32px rgba(42, 37, 32, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.35)';
  const accentColor = isZen ? '#6A9C89' : '#C84B31';
  const primaryText = isZen ? 'var(--text-primary)' : '#2A2520';
  const mutedText = isZen ? 'var(--text-tertiary)' : 'rgba(42, 37, 32, 0.55)';
  const inputBorder = inputFocused
    ? (isZen ? '1px solid rgba(106, 156, 137, 0.45)' : '1px solid rgba(42, 37, 32, 0.25)')
    : '1px solid rgba(42, 37, 32, 0.08)';
  const inputShadow = isZen && inputFocused ? '0 0 0 3px rgba(106, 156, 137, 0.08)' : 'none';
  const sendBg = !inputValue?.trim() || disabled
    ? 'rgba(42, 37, 32, 0.08)'
    : (isZen ? 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)' : '#2A2520');
  const groupedChoices = choiceGroups ?? (choices?.length ? [{ label: '你可以问', items: choices }] : []);
  const hasGroupedChoices = groupedChoices.some((group) => group.items.length > 0);
  const minHeight = minHeightProp ?? (isMobile ? '168px' : '204px');
  const maxHeight = maxHeightProp ?? (
    showChoices && hasGroupedChoices
      ? (isMobile ? '58vh' : '58vh')
      : (isMobile ? '42vh' : '34vh')
  );

  return (
    <div
      className="animate-dialog-enter"
      style={{
        position: 'absolute',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        width,
        maxWidth,
        minHeight,
        maxHeight,
        background,
        backdropFilter: isZen ? 'blur(20px) saturate(125%)' : 'blur(18px) saturate(125%)',
        WebkitBackdropFilter: isZen ? 'blur(20px) saturate(125%)' : 'blur(18px) saturate(125%)',
        border: isZen ? '1px solid rgba(106,156,137,0.25)' : '1px solid rgba(255, 255, 255, 0.45)',
        borderBottom: isZen ? '1px solid rgba(106,156,137,0.16)' : 'none',
        borderRadius,
        boxShadow,
        overflow: 'hidden',
      }}
    >
      {isZen && (
        <>
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner, index) => {
            const isTop = corner.startsWith('t');
            const isLeft = corner.endsWith('l');
            return (
              <span
                key={corner}
                className="dialog-corner"
                style={{
                  position: 'absolute',
                  width: 12,
                  height: 12,
                  [isTop ? 'top' : 'bottom']: -2,
                  [isLeft ? 'left' : 'right']: -2,
                  borderColor: 'rgba(106,156,137,0.35)',
                  borderStyle: 'solid',
                  borderWidth: `${isTop ? 1 : 0}px ${isLeft ? 0 : 1}px ${isTop ? 0 : 1}px ${isLeft ? 1 : 0}px`,
                  borderRadius: `${isTop && isLeft ? 8 : 0}px ${isTop && !isLeft ? 8 : 0}px ${!isTop && !isLeft ? 8 : 0}px ${!isTop && isLeft ? 8 : 0}px`,
                  animationDelay: `${index * 80 + 360}ms`,
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </>
      )}

      {/* 顶部微标 + 历史按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 18px 6px' : '12px 28px 6px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 600,
              color: primaryText,
              letterSpacing: '0.04em',
              fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
            }}
          >
            {speakerName}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              color: currentStatus.color,
              background: currentStatus.bg,
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: currentStatus.dot,
                boxShadow: `0 0 8px ${currentStatus.dot}55`,
                animation: resolvedStatus === 'speaking' ? 'breathe-glow 2.4s ease-in-out infinite' : undefined,
              }}
            />
            {currentStatus.label}
          </span>
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
              gap: '4px',
              padding: '4px 10px',
              background: isHistoryOpen
                ? (isZen ? 'rgba(106, 156, 137, 0.10)' : 'rgba(42, 37, 32, 0.06)')
                : 'transparent',
              border: '1px solid transparent',
              borderRadius: '8px',
              color: isHistoryOpen ? primaryText : mutedText,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
              fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isZen ? 'rgba(106,156,137,0.06)' : 'rgba(42,37,32,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isHistoryOpen
                ? isZen ? 'rgba(106,156,137,0.10)' : 'rgba(42,37,32,0.06)'
                : 'transparent';
            }}
          >
            {isHistoryOpen ? <CloseOutlined /> : <HistoryOutlined />}
            <span>{isHistoryOpen ? '关闭' : '记录'}</span>
          </button>
        )}
      </div>

      {isZen && (
        <div
          style={{
            alignSelf: 'center',
            width: 100,
            height: 1,
            background: 'rgba(42,37,32,0.04)',
            flexShrink: 0,
          }}
        />
      )}

      {/* 主文本区域 */}
      <div
        onClick={handleClick}
        style={{
          flex: showChoices && hasGroupedChoices ? '0 0 auto' : 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '8px 18px 10px' : '8px 28px 12px',
          cursor: showChoices || !text ? 'default' : 'pointer',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            fontSize: isMobile ? '15px' : '17px',
            lineHeight: 1.75,
            color: primaryText,
            letterSpacing: '0.3px',
            wordBreak: 'break-word',
            fontFamily: "var(--font-serif), 'Noto Serif SC', 'Source Han Serif SC', serif",
          }}
        >
          {isThinking ? (
            <InkLoading />
          ) : (
            <>
              {isComplete ? renderSmartContent(displayText) : displayText}
              {!isComplete && (
                <span
                  style={{
                    animation: 'blink-cursor 1s step-end infinite',
                    marginLeft: 3,
                    color: isZen ? '#6A9C89' : accentColor,
                  }}
                >
                  ▋
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 选择支 */}
      {showChoices && isComplete && hasGroupedChoices && (
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '0 18px 8px' : '0 28px 12px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 10,
            }}
          >
            {groupedChoices.flatMap((group) =>
              group.items.map((choice) => (
                <button
                  key={`${group.label}-${choice.id}`}
                  onClick={choice.onClick}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    columnGap: 10,
                    rowGap: 7,
                    alignItems: 'center',
                    minHeight: 74,
                    padding: '14px 16px',
                    fontSize: 13,
                    color: primaryText,
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(42,37,32,0.06)',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    fontFamily: "var(--font-serif), 'Noto Serif SC', serif",
                    textAlign: 'left',
                    boxShadow: '0 4px 16px rgba(42,37,32,0.03)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(106,156,137,0.25)';
                    e.currentTarget.style.boxShadow = '0 10px 26px rgba(42,37,32,0.07)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.86)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(42,37,32,0.06)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(42,37,32,0.03)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.70)';
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{choice.icon}</span>
                  <span style={{ lineHeight: 1.45 }}>{choice.text}</span>
                  <span
                    style={{
                      gridColumn: '2',
                      justifySelf: 'start',
                      padding: '2px 7px',
                      borderRadius: 999,
                      fontSize: 11,
                      color: 'rgba(106,156,137,0.88)',
                      background: 'rgba(106,156,137,0.08)',
                      fontFamily: "var(--font-calligraphy), 'KaiTi', serif",
                    }}
                  >
                    {group.label}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          padding: isMobile ? '8px 18px 14px' : '8px 28px 16px',
          borderTop: '1px solid rgba(42, 37, 32, 0.05)',
          flexShrink: 0,
        }}
      >
        {voiceInput && (
          <div style={{ display: 'flex' }}>{voiceInput}</div>
        )}

        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            value={inputValue}
            onChange={(e) => onInputChange?.(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={inputPlaceholder}
            disabled={disabled}
            style={{
              width: '100%',
              borderRadius: '14px',
              height: isMobile ? 42 : 44,
              paddingLeft: 16,
              paddingRight: 16,
              fontSize: '15px',
              background: 'rgba(255, 255, 255, 0.55)',
              border: inputBorder,
              color: primaryText,
              boxShadow: inputShadow,
              transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>

        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSend}
          disabled={disabled || !inputValue?.trim()}
          style={{
            borderRadius: '50%',
            width: isMobile ? 42 : 44,
            height: isMobile ? 42 : 44,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: sendBg,
            border: 'none',
            fontSize: '15px',
            transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes thinking-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-dialog-enter {
          animation: dialogEnter 500ms cubic-bezier(0.22, 1, 0.36, 1) 300ms both;
        }
        .dialog-corner {
          opacity: 0;
          animation: cornerReveal 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes dialogEnter {
          from { opacity: 0; transform: translateX(-50%) translateY(40px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes cornerReveal {
          from { opacity: 0; transform: scale(0.65); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GalgameDialog;
