import React from 'react';
import {
  AudioOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  MessageOutlined,
  SendOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { ThemeTopic } from '../../types/themeCards';
import { ASK_ME_SUGGESTIONS, SERVICE_PROMISES, SERVICE_SCENARIOS } from './askMeServiceConfig';

type AssistantStatus = 'listening' | 'thinking' | 'speaking';

interface AskMeHeroProps {
  visible?: boolean;
  status: AssistantStatus;
  disabled?: boolean;
  onAsk: (params: { topic: ThemeTopic; question: string }) => void;
}

const STATUS_META: Record<AssistantStatus, { label: string; color: string; hint: string }> = {
  listening: {
    label: '待提问',
    color: '#2D8B57',
    hint: '可语音，也可直接打字',
  },
  thinking: {
    label: '检索中',
    color: '#2A4D6E',
    hint: '正在匹配景区资料库',
  },
  speaking: {
    label: '讲解中',
    color: '#C8A951',
    hint: '同步语音、表情与口型',
  },
};

const AskMeHero: React.FC<AskMeHeroProps> = ({
  visible = true,
  status,
  disabled = false,
  onAsk,
}) => {
  if (!visible) return null;

  const currentStatus = STATUS_META[status];

  return (
    <section
      data-testid="ask-me-hero"
      className="ask-me-hero-shell"
      style={{
        position: 'absolute',
        top: 78,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 108,
        width: 680,
        maxWidth: 'min(680px, calc(100vw - 690px))',
        minWidth: 500,
        padding: 22,
        borderRadius: 28,
        background:
          'linear-gradient(135deg, rgba(253,251,247,0.88) 0%, rgba(244,240,230,0.76) 52%, rgba(232,242,238,0.74) 100%)',
        border: '1px solid rgba(255,255,255,0.60)',
        boxShadow:
          '0 28px 78px rgba(42,37,32,0.16), inset 0 1px 0 rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px) saturate(132%)',
        WebkitBackdropFilter: 'blur(24px) saturate(132%)',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          right: -92,
          top: -120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,169,81,0.28), transparent 64%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          left: -84,
          bottom: -110,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(106,156,137,0.24), transparent 68%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 9,
          borderRadius: 22,
          border: '1px solid rgba(106,156,137,0.12)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(42,77,110,0.08)',
              color: '#2A4D6E',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            <DatabaseOutlined />
            已接入灵山胜境知识库
          </div>

          <h1
            style={{
              margin: '15px 0 0',
              fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
              fontSize: 48,
              lineHeight: 1,
              letterSpacing: '0.18em',
              color: '#241F1A',
              textShadow: '0 8px 24px rgba(42,37,32,0.10)',
            }}
          >
            问我
          </h1>
          <p
            style={{
              margin: '12px 0 0',
              color: 'rgba(42,37,32,0.66)',
              fontSize: 14,
              lineHeight: 1.85,
              maxWidth: 360,
            }}
          >
            小景会先理解你的语音或文字，再检索官方资料包，最后用数字人口播、表情和右侧证据卡给出可验证回答。
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              marginTop: 16,
            }}
          >
            {SERVICE_PROMISES.map((promise) => (
              <div
                key={promise.label}
                style={{
                  padding: '10px 9px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.56)',
                  border: '1px solid rgba(42,37,32,0.06)',
                }}
              >
                <div style={{ color: '#6A9C89', fontSize: 15 }}>{promise.icon}</div>
                <div style={{ marginTop: 5, fontSize: 12, fontWeight: 800, color: '#2A2520' }}>
                  {promise.value}
                </div>
                <div style={{ marginTop: 1, fontSize: 10, color: 'rgba(42,37,32,0.48)' }}>
                  {promise.label}
                </div>
              </div>
            ))}
          </div>

          <div
            data-testid="ask-me-status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              marginTop: 14,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.62)',
              border: '1px solid rgba(42,37,32,0.06)',
              color: currentStatus.color,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: currentStatus.color,
                boxShadow: `0 0 14px ${currentStatus.color}88`,
                animation: status === 'listening' ? 'askHeroPulse 1.8s ease-in-out infinite' : undefined,
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 900 }}>{currentStatus.label}</span>
            <span style={{ width: 1, height: 12, background: 'rgba(42,37,32,0.10)' }} />
            <span style={{ fontSize: 12, color: 'rgba(42,37,32,0.54)' }}>{currentStatus.hint}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {ASK_ME_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={suggestion.id}
              data-testid={`ask-suggestion-${suggestion.id}`}
              onClick={() => onAsk({ topic: suggestion.topic, question: suggestion.question })}
              disabled={disabled}
              className="ask-me-suggestion"
              style={{
                position: 'relative',
                minHeight: 74,
                padding: '12px 13px',
                border: '1px solid rgba(42,37,32,0.07)',
                borderRadius: 19,
                background:
                  index === 0
                    ? `linear-gradient(135deg, ${suggestion.accent}18, rgba(255,255,255,0.72))`
                    : 'rgba(255,255,255,0.58)',
                color: '#2A2520',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: disabled ? 0.55 : 1,
                transition:
                  'transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
                animation: `askHeroCardIn 380ms cubic-bezier(0.22,1,0.36,1) ${index * 60 + 90}ms both`,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 'auto 12px 10px auto',
                  color: 'rgba(42,37,32,0.20)',
                  fontSize: 13,
                }}
              >
                <SendOutlined />
              </span>
              <span style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    color: suggestion.accent,
                    background: `${suggestion.accent}15`,
                    fontSize: 17,
                    flexShrink: 0,
                  }}
                >
                  {suggestion.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 900, lineHeight: 1.25 }}>
                    {suggestion.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: 'rgba(42,37,32,0.56)',
                    }}
                  >
                    {suggestion.detail}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid rgba(42,37,32,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          color: 'rgba(42,37,32,0.52)',
          fontSize: 12,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <AudioOutlined style={{ color: '#6A9C89' }} />
          长按麦克风开始语音提问
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SoundOutlined style={{ color: '#C8A951' }} />
          已覆盖 {SERVICE_SCENARIOS.length} 类游客服务
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#2D8B57' }} />
          回答可进入后台满意度分析
        </span>
      </div>

      <style>{`
        .ask-me-hero-shell {
          animation: askHeroIn 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ask-me-suggestion:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.01);
          border-color: rgba(106,156,137,0.35);
          background: rgba(255,255,255,0.82);
          box-shadow: 0 16px 30px rgba(42,37,32,0.09);
        }
        @keyframes askHeroIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.98); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes askHeroCardIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes askHeroPulse {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50% { transform: scale(1.45); opacity: 1; }
        }
      `}</style>
    </section>
  );
};

export default AskMeHero;

