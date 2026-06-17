import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  BookOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  EyeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  TravelMemory,
  JourneySummary,
  listMemories,
  generateMemories,
  polishMemory,
  generateSummary,
  getLatestSummary,
} from '../../api/memory';
import ShareCard from '../../components/Memory/ShareCard';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const SESSION_KEY = 'tourist_session_id';

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `session_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const MOOD_COLORS: Record<string, string> = {
  '敬畏': '#6A9C89',
  '惊喜': '#E8A838',
  '平静': '#8CBFAD',
  '感动': '#D4A5A5',
  '愉悦': '#C8A951',
};

const MOOD_ICONS: Record<string, string> = {
  '敬畏': '🏔️',
  '惊喜': '✨',
  '平静': '🍃',
  '感动': '💫',
  '愉悦': '🌸',
};

const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [polishingId, setPolishingId] = useState<number | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sessionId = getSessionId();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listMemories(sessionId);
      setMemories(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getLatestSummary(sessionId);
      setSummary(data);
    } catch {
      // silent
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMemories();
    fetchSummary();
  }, [fetchMemories, fetchSummary]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateMemories(sessionId);
      setMemories(result.memories);
      if (result.new_count > 0) {
        message.success(`已提取 ${result.new_count} 条新记忆`);
      } else {
        message.info('暂无新的对话记忆可提取');
      }
    } catch {
      message.error('记忆生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handlePolish = async (memoryId: number) => {
    setPolishingId(memoryId);
    try {
      const polished = await polishMemory(memoryId);
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? polished : m))
      );
      message.success('润色完成');
    } catch {
      message.error('润色失败，请稍后重试');
    } finally {
      setPolishingId(null);
    }
  };

  const handleSummarize = async () => {
    if (memories.length === 0) {
      message.warning('请先生成旅行记忆');
      return;
    }
    setSummarizing(true);
    try {
      const result = await generateSummary(sessionId);
      setSummary(result);
      message.success('旅程总结已生成');
    } catch {
      message.error('总结生成失败，请稍后重试');
    } finally {
      setSummarizing(false);
    }
  };

  const spotCount = new Set(memories.map((m) => m.spot_name).filter(Boolean)).size;

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* ═══ 标题区 ═══ */}
        <div style={{
          textAlign: 'center', marginBottom: 36, position: 'relative',
          overflow: 'hidden', padding: '40px 24px 32px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(106,156,137,0.06) 0%, rgba(200,169,81,0.06) 50%, rgba(200,75,49,0.04) 100%)',
        }}>
          <div style={{
            width: 140, height: 2,
            background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
            margin: '0 auto 20px',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'all 800ms ease 200ms',
          }} />

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 600ms ease 400ms',
          }}>
            {['📖', '🏔️', '🎋', '📜', '🏮'].map((icon, i) => (
              <span key={i} style={{
                fontSize: 20,
                opacity: loaded ? 0.8 : 0,
                transform: loaded ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 500ms cubic-bezier(0.34,1.56,0.64,1) ${400 + i * 80}ms`,
                display: 'inline-block',
              }}>{icon}</span>
            ))}
          </div>

          <h1 style={{
            margin: '0 0 8px', fontSize: 30, fontWeight: 800,
            fontFamily: 'var(--font-calligraphy)',
            color: 'var(--text-primary)', letterSpacing: 6,
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 800ms cubic-bezier(0.25,1,0.45,0.94) 300ms',
          }}>
            旅行记忆册
          </h1>
          <p style={{
            margin: 0, fontSize: 15, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-serif)', letterSpacing: 2,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 800ms ease 600ms',
          }}>
            拾光成册，落笔生花
          </p>
        </div>

        {/* ═══ 旅程概览 ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: isMobile ? 12 : 16,
          marginBottom: isMobile ? 24 : 32,
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(15px)',
          transition: 'all 600ms ease 500ms',
        }}>
          {[
            { icon: <BookOutlined />, value: memories.length, label: '条记忆', color: 'var(--color-primary)' },
            { icon: <EnvironmentOutlined />, value: spotCount, label: '处景点', color: 'var(--color-auxiliary)' },
            { icon: <HeartOutlined />, value: new Set(memories.map(m => m.mood_tag).filter(Boolean)).size, label: '种心情', color: 'var(--color-accent)' },
            { icon: <ClockCircleOutlined />, value: summary ? '已生成' : '待生成', label: '旅程总结', color: 'var(--color-gold)' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'var(--surface-card)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 16px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-light)',
              transition: 'all var(--transition-normal)',
            }}>
              <div style={{ fontSize: 20, color: stat.color, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{
                fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif)',
                color: 'var(--text-primary)', marginBottom: 4,
              }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ 操作区 ═══ */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28,
          justifyContent: 'center',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 600ms ease 700ms',
        }}>
          <button
            className="btn-seal btn-seal--filled"
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: generating ? 0.7 : 1 }}
          >
            {generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
            {generating ? '正在提取...' : '从对话提取记忆'}
          </button>
          <button
            className="btn-seal btn-seal--filled"
            onClick={handleSummarize}
            disabled={summarizing || memories.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (summarizing || memories.length === 0) ? 0.5 : 1 }}
          >
            {summarizing ? <LoadingOutlined /> : <EditOutlined />}
            {summarizing ? '正在生成...' : '生成旅程总结'}
          </button>
          {memories.length > 0 && (
            <button
              className="btn-seal"
              onClick={() => setShowShareCard(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ShareAltOutlined />
              生成分享卡片
            </button>
          )}
        </div>

        {/* ═══ 记忆卡片 ═══ */}
        {loading ? (
          <div style={{
            textAlign: 'center', padding: 60, color: 'var(--text-tertiary)',
          }}>
            <LoadingOutlined style={{ fontSize: 28, marginBottom: 12, color: 'var(--color-primary)' }} />
            <p style={{ fontFamily: 'var(--font-serif)' }}>翻阅记忆册中...</p>
          </div>
        ) : memories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
          }}>
            <BookOutlined style={{ fontSize: 40, color: 'var(--text-tertiary)', marginBottom: 16 }} />
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 16,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              记忆册尚为空
            </p>
            <p style={{
              fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20,
            }}>
              先去和 AI 导游聊聊吧，对话记录会自动转化为旅行记忆
            </p>
            <button
              className="btn-seal btn-seal--filled"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? '正在提取...' : '尝试提取记忆'}
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: isMobile ? 16 : 20,
            marginBottom: isMobile ? 24 : 32,
          }}>
            {memories.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 22px 20px',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-light)',
                  transition: 'all var(--transition-normal)',
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${600 + idx * 80}ms`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* 顶部装饰线 */}
                <div style={{
                  position: 'absolute', top: 0, left: 22, right: 22, height: 2,
                  background: `linear-gradient(90deg, transparent, ${MOOD_COLORS[m.mood_tag || ''] || 'var(--color-primary)'}, transparent)`,
                  opacity: 0.4,
                }} />

                {/* 标题行 */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 12,
                }}>
                  <h3 style={{
                    margin: 0, fontSize: 17, fontWeight: 700,
                    fontFamily: 'var(--font-calligraphy)',
                    color: 'var(--text-primary)',
                    flex: 1, lineHeight: 1.4,
                  }}>
                    {m.title}
                  </h3>
                  {m.mood_tag && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: `${MOOD_COLORS[m.mood_tag] || '#999'}18`,
                      color: MOOD_COLORS[m.mood_tag] || '#999',
                      fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8,
                    }}>
                      {MOOD_ICONS[m.mood_tag] || '🏷️'} {m.mood_tag}
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <div style={{
                  fontSize: 14, lineHeight: 1.8,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-serif)',
                  marginBottom: 14,
                }}>
                  {expandedId === m.id && m.polished_content ? (
                    <div>
                      <div style={{
                        fontSize: 11, color: 'var(--color-primary)',
                        marginBottom: 6, fontWeight: 600,
                      }}>
                        ✨ AI 润色
                      </div>
                      <div style={{
                        padding: '12px 14px',
                        background: 'var(--color-primary-bg)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--color-primary)',
                      }}>
                        {m.polished_content}
                      </div>
                      <div
                        style={{
                          marginTop: 10, fontSize: 12,
                          color: 'var(--text-tertiary)', cursor: 'pointer',
                        }}
                        onClick={() => setExpandedId(null)}
                      >
                        ← 查看原文
                      </div>
                    </div>
                  ) : (
                    <div>
                      {m.original_content}
                      {m.polished_content && (
                        <div
                          style={{
                            marginTop: 8, fontSize: 12,
                            color: 'var(--color-primary)', cursor: 'pointer',
                          }}
                          onClick={() => setExpandedId(m.id)}
                        >
                          <EyeOutlined /> 查看润色版本 →
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 底部标签 + 操作 */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {m.spot_name && (
                      <span className="badge-seal" style={{ fontSize: 11 }}>
                        {m.spot_name}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, color: 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <ClockCircleOutlined />
                      {new Date(m.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePolish(m.id)}
                    disabled={!!m.polished_content || polishingId === m.id}
                    style={{
                      fontSize: 12, padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid',
                      borderColor: m.polished_content ? 'var(--border-light)' : 'var(--color-primary)',
                      color: m.polished_content ? 'var(--text-tertiary)' : 'var(--color-primary)',
                      background: m.polished_content ? 'var(--gray-50)' : 'transparent',
                      cursor: m.polished_content ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all var(--transition-fast)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {polishingId === m.id ? (
                      <><LoadingOutlined /> 润色中...</>
                    ) : m.polished_content ? (
                      <><CheckCircleOutlined /> 已润色</>
                    ) : (
                      <><EditOutlined /> AI 润色</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ 旅程总结 ═══ */}
        {summary && (
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 28px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-gold), var(--color-accent))',
            }} />
            <h2 style={{
              margin: '0 0 8px', fontSize: 22, fontWeight: 800,
              fontFamily: 'var(--font-calligraphy)',
              color: 'var(--text-primary)',
            }}>
              📜 {summary.title}
            </h2>
            <div style={{
              display: 'flex', gap: 16, marginBottom: 16,
              fontSize: 12, color: 'var(--text-tertiary)',
            }}>
              <span>{summary.date_range}</span>
              <span>{summary.memory_count} 条记忆</span>
              <span>{summary.spot_count} 处景点</span>
            </div>
            <div style={{
              fontSize: 15, lineHeight: 2,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-serif)',
              whiteSpace: 'pre-wrap',
            }}>
              {summary.content}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 分享卡片弹窗 ═══ */}
      {showShareCard && (
        <ShareCard
          memories={memories}
          summary={summary}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
};

export default MemoryPage;
