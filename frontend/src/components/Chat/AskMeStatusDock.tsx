import React, { useMemo } from 'react';
import {
  AudioOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
  LoadingOutlined,
  MessageOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { findScenarioByTopic } from './askMeServiceConfig';

export type AskMeStage = 'idle' | 'transcribing' | 'retrieving' | 'speaking' | 'done' | 'error';

interface AskMeStatusDockProps {
  stage: AskMeStage;
  topic?: string | null;
  source?: 'faq' | 'rag' | 'cache' | 'offline';
  visible?: boolean;
}

const STAGE_META: Record<AskMeStage, { label: string; hint: string; color: string; icon: React.ReactNode }> = {
  idle: {
    label: '待命中',
    hint: '选择左侧服务，或直接问小景',
    color: '#2D8B57',
    icon: <MessageOutlined />,
  },
  transcribing: {
    label: '语音识别',
    hint: '正在把语音转成文字',
    color: '#C84B31',
    icon: <AudioOutlined />,
  },
  retrieving: {
    label: '知识检索',
    hint: '正在匹配官方资料与 FAQ',
    color: '#2A4D6E',
    icon: <DatabaseOutlined />,
  },
  speaking: {
    label: '数字人讲解',
    hint: '正在同步语音、表情与口型',
    color: '#C8A951',
    icon: <SoundOutlined />,
  },
  done: {
    label: '回答完成',
    hint: '可查看右侧卡片或继续追问',
    color: '#2D8B57',
    icon: <CheckCircleOutlined />,
  },
  error: {
    label: '需要重试',
    hint: '网络或识别异常，请重新提问',
    color: '#DC4444',
    icon: <CloudSyncOutlined />,
  },
};

const SOURCE_LABELS: Record<string, string> = {
  faq: 'FAQ 命中',
  rag: '知识库检索',
  cache: '缓存回答',
  offline: '离线内容',
};

const STEPS = [
  { key: 'input', label: '接收问题' },
  { key: 'retrieve', label: '检索资料' },
  { key: 'answer', label: '组织讲解' },
  { key: 'voice', label: '语音口播' },
];

function getStepState(stage: AskMeStage, index: number): 'done' | 'current' | 'todo' {
  const currentIndexMap: Record<AskMeStage, number> = {
    idle: -1,
    transcribing: 0,
    retrieving: 1,
    speaking: 3,
    done: 4,
    error: 1,
  };
  const currentIndex = currentIndexMap[stage];
  if (stage === 'done') return 'done';
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return 'todo';
}

const AskMeStatusDock: React.FC<AskMeStatusDockProps> = ({ stage, topic, source, visible = true }) => {
  const scenario = useMemo(() => findScenarioByTopic(topic), [topic]);
  const meta = STAGE_META[stage];

  if (!visible) return null;

  return (
    <div
      data-testid="ask-me-status-dock"
      style={{
        position: 'absolute',
        top: 72,
        left: 26,
        right: 26,
        zIndex: 107,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 340,
          borderRadius: 22,
          padding: 14,
          background: 'linear-gradient(135deg, rgba(253,251,247,0.78), rgba(255,255,255,0.56))',
          border: '1px solid rgba(255,255,255,0.62)',
          boxShadow: '0 18px 42px rgba(42,37,32,0.10)',
          backdropFilter: 'blur(18px) saturate(126%)',
          WebkitBackdropFilter: 'blur(18px) saturate(126%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              background: `${meta.color}18`,
              color: meta.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: `0 0 0 1px ${meta.color}16`,
            }}
          >
            {stage === 'retrieving' || stage === 'transcribing' ? <LoadingOutlined /> : meta.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{meta.label}</strong>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: meta.color,
                  boxShadow: `0 0 12px ${meta.color}88`,
                  animation: stage === 'idle' || stage === 'done' ? undefined : 'askDockPulse 1.4s ease-in-out infinite',
                }}
              />
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: 'rgba(42,37,32,0.54)' }}>{meta.hint}</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 13,
          }}
        >
          {STEPS.map((step, index) => {
            const stepState = getStepState(stage, index);
            const color = stepState === 'done' ? '#2D8B57' : stepState === 'current' ? meta.color : 'rgba(42,37,32,0.18)';
            return (
              <React.Fragment key={step.key}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: stepState === 'todo' ? 'rgba(255,255,255,0.50)' : `${color}18`,
                    color,
                    border: `1px solid ${color}`,
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {stepState === 'done' ? '✓' : index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: stepState === 'done' ? 'rgba(45,139,87,0.42)' : 'rgba(42,37,32,0.12)',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 4,
            marginTop: 6,
            color: 'rgba(42,37,32,0.46)',
            fontSize: 10,
          }}
        >
          {STEPS.map((step) => (
            <span key={step.key} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
              {step.label}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 280,
          borderRadius: 22,
          padding: 14,
          background: 'linear-gradient(135deg, rgba(42,77,110,0.78), rgba(45,139,87,0.72))',
          color: '#FDFBF7',
          boxShadow: '0 18px 42px rgba(42,77,110,0.18)',
          backdropFilter: 'blur(18px) saturate(126%)',
          WebkitBackdropFilter: 'blur(18px) saturate(126%)',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: '0.16em', opacity: 0.72 }}>CURRENT SERVICE</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
            }}
          >
            {scenario?.icon || <MessageOutlined />}
          </span>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 15 }}>
              {scenario?.label || '自由问答'}
            </strong>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, opacity: 0.74 }}>
              {scenario?.deliverable || '回答 + 追问建议'}
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 11,
            opacity: 0.82,
          }}
        >
          <span>{source ? SOURCE_LABELS[source] || source : '等待检索'}</span>
          <span>目标响应 &lt; 5s</span>
        </div>
      </div>

      <style>{`
        @keyframes askDockPulse {
          0%, 100% { transform: scale(0.8); opacity: 0.55; }
          50% { transform: scale(1.35); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AskMeStatusDock;

