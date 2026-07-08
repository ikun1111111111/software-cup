import React, { useMemo } from 'react';
import {
  BulbOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  LikeOutlined,
  MessageOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import ThemeCardContainer from './ThemeCardContainer';
import type { ThemeCard, ThemeTopic } from '../../types/themeCards';
import { TOPIC_LABELS, TOPIC_ICONS } from '../../types/themeCards';
import { findScenarioByTopic } from '../Chat/askMeServiceConfig';

interface Props {
  topic: string | null;
  card: ThemeCard | null;
  collapsed: boolean;
  onToggle: () => void;
  source?: 'faq' | 'rag' | 'cache' | 'offline';
  isStreaming?: boolean;
  onAsk?: (params: { topic: ThemeTopic; question: string }) => void;
}

const PANEL_WIDTH = 390;

const SOURCE_META: Record<string, { label: string; detail: string; color: string }> = {
  faq: {
    label: 'FAQ 精准命中',
    detail: '优先来自已维护问答库，适合票务、交通、服务类问题。',
    color: '#2D8B57',
  },
  rag: {
    label: '知识库检索',
    detail: '从官方资料包切片中召回内容，再由大模型组织讲解。',
    color: '#2A4D6E',
  },
  cache: {
    label: '缓存复用',
    detail: '复用近期相似问题回答，提升响应速度。',
    color: '#C8A951',
  },
  offline: {
    label: '离线内容',
    detail: '使用本地预置导览资料，适配弱网/无信号场景。',
    color: '#6A6258',
  },
};

const TopicInfoPanel: React.FC<Props> = ({
  topic,
  card,
  collapsed,
  onToggle,
  source,
  isStreaming = false,
  onAsk,
}) => {
  const scenario = useMemo(() => findScenarioByTopic(topic), [topic]);
  const displayTopic = useMemo(() => {
    if (!topic) return null;
    return {
      label: TOPIC_LABELS[topic as ThemeTopic] || topic,
      icon: TOPIC_ICONS[topic as ThemeTopic] || '✦',
    };
  }, [topic]);
  const sourceMeta = source ? SOURCE_META[source] || SOURCE_META.rag : null;

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: 18,
          top: 76,
          zIndex: 115,
          padding: '9px 14px',
          borderRadius: 999,
          border: '1px solid rgba(106,156,137,0.24)',
          background: 'rgba(253, 251, 247, 0.84)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          fontSize: 13,
          boxShadow: '0 12px 30px rgba(42,37,32,0.10)',
        }}
      >
        打开证据面板
      </button>
    );
  }

  const promptTopic = (scenario?.topic || topic || 'general') as ThemeTopic;

  return (
    <aside
      style={{
        width: PANEL_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, rgba(253,251,247,0.94) 0%, rgba(247,244,237,0.88) 100%)',
        borderLeft: '1px solid rgba(106,156,137,0.18)',
        boxShadow: '-18px 0 52px rgba(42,37,32,0.10)',
        backdropFilter: 'blur(20px) saturate(130%)',
        WebkitBackdropFilter: 'blur(20px) saturate(130%)',
        zIndex: 112,
        animation: 'slideInRight 300ms var(--ease-out-expo) both',
        position: 'relative',
      }}
    >
      <header
        style={{
          padding: '76px 18px 16px',
          borderBottom: '1px solid rgba(42,37,32,0.07)',
          background:
            'radial-gradient(circle at 80% 10%, rgba(200,169,81,0.18), transparent 34%), rgba(255,255,255,0.34)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                background: scenario ? `${scenario.accent}18` : 'var(--color-primary-bg)',
                color: scenario?.accent || 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {scenario?.icon || displayTopic?.icon || '✦'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--text-primary)',
                  letterSpacing: 0.5,
                }}
              >
                {scenario?.deliverable || displayTopic?.label || '导览证据板'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(42,37,32,0.50)', marginTop: 3, lineHeight: 1.5 }}>
                {scenario?.evidence || '回答后会展示知识来源、主题卡片与后续行动。'}
              </div>
            </div>
          </div>
          <button
            onClick={onToggle}
            style={{
              width: 30,
              height: 30,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.46)',
              border: '1px solid rgba(42,37,32,0.08)',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
              flexShrink: 0,
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <section
          style={{
            padding: 14,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.58)',
            border: '1px solid rgba(42,37,32,0.06)',
            boxShadow: '0 10px 24px rgba(42,37,32,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FileSearchOutlined style={{ color: scenario?.accent || '#6A9C89' }} />
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>回答可信度提示</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '知识来源', value: sourceMeta?.label || '待检索' },
              { label: '输出卡片', value: card ? '已生成' : isStreaming ? '生成中' : '待生成' },
              { label: '反馈闭环', value: '可评价' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '9px 8px',
                  borderRadius: 13,
                  background: 'rgba(248,246,240,0.72)',
                  border: '1px solid rgba(42,37,32,0.05)',
                }}
              >
                <div style={{ fontSize: 10, color: 'rgba(42,37,32,0.45)' }}>{item.label}</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {sourceMeta && (
            <div
              style={{
                marginTop: 11,
                padding: '10px 11px',
                borderRadius: 14,
                background: `${sourceMeta.color}10`,
                color: 'rgba(42,37,32,0.62)',
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: sourceMeta.color }}>{sourceMeta.label}</strong> · {sourceMeta.detail}
            </div>
          )}
        </section>

        <ThemeCardContainer card={card} topic={scenario?.label || displayTopic?.label || topic} />

        <section
          style={{
            padding: 14,
            borderRadius: 18,
            background:
              'linear-gradient(135deg, rgba(42,77,110,0.08), rgba(106,156,137,0.08), rgba(255,255,255,0.58))',
            border: '1px solid rgba(106,156,137,0.14)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <BulbOutlined style={{ color: scenario?.accent || '#C8A951' }} />
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>下一步可以这样问</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(scenario?.prompts || [
              { title: '继续追问', question: '请再详细讲解一下刚才提到的重点。' },
              { title: '换成路线', question: '请把这个回答整理成适合游览的路线建议。' },
            ]).slice(0, 3).map((prompt) => (
              <button
                key={prompt.title}
                onClick={() => onAsk?.({ topic: promptTopic, question: prompt.question })}
                disabled={!onAsk || isStreaming}
                style={{
                  border: '1px solid rgba(42,37,32,0.06)',
                  borderRadius: 14,
                  padding: '10px 11px',
                  background: 'rgba(255,255,255,0.62)',
                  color: 'var(--text-secondary)',
                  cursor: !onAsk || isStreaming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  textAlign: 'left',
                  opacity: !onAsk || isStreaming ? 0.55 : 1,
                }}
              >
                <span>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13 }}>
                    {prompt.title}
                  </strong>
                  <span style={{ display: 'block', marginTop: 3, fontSize: 12, lineHeight: 1.45 }}>
                    {prompt.question}
                  </span>
                </span>
                <RightOutlined style={{ fontSize: 11, color: 'rgba(42,37,32,0.32)' }} />
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: 14,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.50)',
            border: '1px solid rgba(42,37,32,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SafetyCertificateOutlined style={{ color: '#2D8B57' }} />
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>赛题能力映射</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12, color: 'rgba(42,37,32,0.62)' }}>
            {[
              ['多模态交互', '语音/文字输入，数字人语音输出'],
              ['景区知识问答', 'FAQ + RAG 资料库检索'],
              ['运营数据沉淀', '对话、来源、满意度进入后台分析'],
            ].map(([title, detail]) => (
              <div key={title} style={{ display: 'flex', gap: 8 }}>
                <CheckCircleOutlined style={{ color: '#2D8B57', marginTop: 2 }} />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>{title}</strong> · {detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: 14,
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(200,75,49,0.08), rgba(255,255,255,0.52))',
            border: '1px solid rgba(200,75,49,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LikeOutlined style={{ color: '#C84B31' }} />
            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>满意度入口</strong>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.7, color: 'rgba(42,37,32,0.58)' }}>
            回答完成后可在历史记录中点赞/点踩，后台会统计游客关注点、情绪趋势与满意度。
          </p>
        </section>
      </div>

      <style>{`
        aside button:hover:not(:disabled) {
          transform: translateY(-1px);
          transition: transform 160ms ease, background 160ms ease;
        }
      `}</style>
    </aside>
  );
};

export default TopicInfoPanel;

