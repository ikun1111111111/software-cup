import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RobotOutlined,
  CloseOutlined,
  SendOutlined,
  SoundOutlined,
  EnvironmentOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useGuide } from '../../hooks/useGuide';

const GuideAssistant: React.FC = () => {
  const [state, actions] = useGuide();
  const [expanded, setExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [tab, setTab] = useState<'chat' | 'narration' | 'route'>('chat');
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 初始化向导
  useEffect(() => {
    actions.init();
  }, [actions.init]);

  // 自动滚动到底部
  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, expanded]);

  // 页面空闲检测：每 10 秒检查一次，超过 2 分钟无操作发送心跳
  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('scroll', resetActivity, { passive: true });

    const id = window.setInterval(() => {
      const idle = (Date.now() - lastActivityRef.current) / 1000;
      if (idle > 120 && state.status !== 'prompting' && state.status !== 'narrating' && state.status !== 'chatting') {
        actions.heartbeat({ idle_time: idle });
      }
    }, 10000);
    idleTimerRef.current = id;

    return () => {
      window.removeEventListener('pointerdown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      if (idleTimerRef.current) window.clearInterval(idleTimerRef.current);
    };
  }, [actions.heartbeat, state.status]);

  // 自动消失轻提示
  useEffect(() => {
    if (!state.currentPrompt?.auto_dismiss) return;
    const timer = window.setTimeout(() => {
      if (state.currentPrompt) actions.dismissPrompt();
    }, state.currentPrompt.auto_dismiss * 1000);
    return () => window.clearTimeout(timer);
  }, [state.currentPrompt, actions.dismissPrompt]);

  // 快捷键 Ctrl+K / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setExpanded((v) => !v);
      }
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || state.isLoading) return;
    actions.sendQuestion(text);
    setInputText('');
    setTab('chat');
  }, [inputText, state.isLoading, actions.sendQuestion]);

  const handleQuickQuestion = useCallback(
    (q: string) => {
      actions.sendQuestion(q);
      setTab('chat');
      if (!expanded) setExpanded(true);
    },
    [actions.sendQuestion, expanded],
  );

  // 拖拽处理
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = ballRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragRef.current = {
        startX: clientX,
        startY: clientY,
        origX: rect.left,
        origY: rect.top,
        moved: false,
      };

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragRef.current) return;
        const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
        const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
        const dx = cx - dragRef.current.startX;
        const dy = cy - dragRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
        setPosition({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
      };

      const handleEnd = () => {
        if (dragRef.current && !dragRef.current.moved) {
          setExpanded((v) => !v);
        }
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    },
    [],
  );

  const ballStyle: React.CSSProperties =
    position.x >= 0
      ? { position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }
      : { position: 'fixed', right: 24, bottom: 100, zIndex: 1000 };

  const renderPromptActions = () => {
    if (!state.currentPrompt) return null;
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {state.currentPrompt.actions.map((action) => {
          const primary = action === '听听' || action === '推荐' || action === '重新规划';
          return (
            <button
              key={action}
              onClick={() => {
                if (action === '不用了' || action === '静音') {
                  if (action === '静音') actions.setDndMode(true);
                  actions.dismissPrompt();
                } else {
                  actions.acceptPrompt();
                }
              }}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: primary ? 'none' : '1px solid rgba(106,156,137,0.35)',
                background: primary ? 'linear-gradient(135deg, #6A9C89, #8CBFAD)' : 'transparent',
                color: primary ? '#fff' : '#6A9C89',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {action}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* VRM 浮窗 */}
      <div
        ref={ballRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          ...ballStyle,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
          color: '#fff',
          display: expanded ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(106, 156, 137, 0.4)',
          transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <RobotOutlined style={{ fontSize: 24 }} />
        {state.currentPrompt && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: '#C8A951',
              border: '2px solid #fff',
            }}
          />
        )}
      </div>

      {/* 轻提示 Toast */}
      {state.currentPrompt && !expanded && (
        <div
          style={{
            position: 'fixed',
            right: 88,
            bottom: 104,
            maxWidth: 280,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(253, 251, 247, 0.97)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(26, 22, 20, 0.12)',
            border: '1px solid rgba(106, 156, 137, 0.15)',
            zIndex: 999,
            animation: 'guideSlideIn 250ms ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RobotOutlined style={{ fontSize: 12, color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#2A2520' }}>
                {state.currentPrompt.message}
              </p>
              {renderPromptActions()}
            </div>
          </div>
        </div>
      )}

      {/* 展开面板 */}
      {expanded && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 100,
            width: 360,
            maxHeight: 560,
            borderRadius: 18,
            backgroundColor: '#fff',
            boxShadow: '0 8px 32px rgba(26, 22, 20, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            animation: 'assistantSlideIn 200ms ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ fontSize: 18 }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {state.preferences?.preferred_role || '小灵'} · 智能导览
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => actions.setDndMode(!state.preferences?.dnd_mode)}
                title={state.preferences?.dnd_mode ? '关闭免打扰' : '开启免打扰'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BellOutlined style={{ opacity: state.preferences?.dnd_mode ? 0.5 : 1 }} />
              </button>
              <button
                onClick={() => setExpanded(false)}
                aria-label="关闭"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloseOutlined />
              </button>
            </div>
          </div>

          {/* Tab 导航 */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-light)',
              background: '#F8F6F2',
            }}
          >
            {[
              { key: 'chat', label: '对话', icon: <RobotOutlined /> },
              { key: 'narration', label: '讲解', icon: <SoundOutlined /> },
              { key: 'route', label: '路线', icon: <EnvironmentOutlined /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: tab === t.key ? '#fff' : 'transparent',
                  color: tab === t.key ? '#6A9C89' : '#9E988E',
                  fontSize: 13,
                  fontWeight: tab === t.key ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minHeight: 240 }}>
            {/* 对话 Tab */}
            {tab === 'chat' && (
              <>
                {state.messages.length === 0 && (
                  <div style={{ color: '#9E988E', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                    你好！我是灵山胜境的数字导览员，有什么可以帮你的？
                  </div>
                )}
                {state.messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '8px 12px',
                        borderRadius:
                          msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        backgroundColor: msg.role === 'user' ? '#6A9C89' : '#F0F4FF',
                        color: msg.role === 'user' ? '#fff' : '#2A2520',
                        fontSize: 13,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />

                {/* 快捷问题 */}
                {state.messages.length <= 2 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {state.quickQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuickQuestion(q)}
                        disabled={state.isLoading}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 14,
                          fontSize: 12,
                          border: '1px solid rgba(106,156,137,0.25)',
                          background: 'transparent',
                          color: '#6A9C89',
                          cursor: 'pointer',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 讲解 Tab */}
            {tab === 'narration' && (
              <div>
                {state.narration ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: '#F8F6F2',
                      border: '1px solid rgba(106,156,137,0.15)',
                    }}
                  >
                    <h4 style={{ margin: '0 0 8px', color: '#6A9C89', fontSize: 15 }}>
                      {state.narration.spot?.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#2A2520' }}>
                      {state.narration.text}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={actions.endNarration}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: 'none',
                          background: '#6A9C89',
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        结束讲解
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#9E988E', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                    暂无讲解内容，接近景点时会自动提示。
                  </div>
                )}
              </div>
            )}

            {/* 路线 Tab */}
            {tab === 'route' && (
              <div>
                {state.currentRoute ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: '#F8F6F2',
                      border: '1px solid rgba(106,156,137,0.15)',
                    }}
                  >
                    <h4 style={{ margin: '0 0 8px', color: '#6A9C89', fontSize: 15 }}>
                      {state.currentRoute.name}
                    </h4>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5C554C' }}>
                      {state.currentRoute.description}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9E988E' }}>
                        ⏱️ {state.currentRoute.duration}
                      </span>
                      {state.currentRoute.spots?.map((s: any) => (
                        <span
                          key={s.id}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'rgba(106,156,137,0.1)',
                            color: '#6A9C89',
                          }}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#9E988E', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                    暂无推荐路线，可在对话中让向导为您推荐。
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 输入区 */}
          {tab === 'chat' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px 12px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="输入问题..."
                disabled={state.isLoading}
                style={{
                  flex: 1,
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-light)',
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#F8F6F2',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || state.isLoading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: inputText.trim() && !state.isLoading ? '#6A9C89' : '#ccc',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                <SendOutlined />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes assistantSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes guideSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default GuideAssistant;
