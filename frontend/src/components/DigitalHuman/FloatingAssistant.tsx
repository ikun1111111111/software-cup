import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RobotOutlined, CloseOutlined, AudioOutlined } from '@ant-design/icons';
import type { Emotion } from './EmotionController';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  emotion?: Emotion;
}

export interface FloatingAssistantProps {
  /** Prepend messages from external source (e.g. ChatResponse). */
  messages?: ChatMessage[];
  /** Called when user sends a message from the assistant panel. */
  onSend?: (text: string) => void;
  /** Called when user starts voice input. */
  onVoiceStart?: () => void;
  /** Called when the panel opens/closes. */
  onToggle?: (open: boolean) => void;
}

type PanelState = 'collapsed' | 'expanded';

const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  messages = [],
  onSend,
  onVoiceStart,
  onToggle,
}) => {
  const [state, setState] = useState<PanelState>('collapsed');
  const [inputText, setInputText] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 = not set
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (state === 'expanded' && messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, state]);

  // Bounce animation when new message arrives while collapsed
  useEffect(() => {
    if (state === 'collapsed' && messages.length > 0) {
      setHasNewMessage(true);
      const timer = setTimeout(() => setHasNewMessage(false), 300);
      return () => clearTimeout(timer);
    }
  }, [messages.length, state]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        togglePanel();
      }
      if (e.key === 'Escape' && state === 'expanded') {
        setState('collapsed');
        onToggle?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Listen for entity:click events
  useEffect(() => {
    const handleEntityClick = () => {
      if (state === 'collapsed') {
        setState('expanded');
        onToggle?.(true);
      }
    };
    window.addEventListener('entity:click' as any, handleEntityClick);
    return () => window.removeEventListener('entity:click' as any, handleEntityClick);
  }, [state]);

  const togglePanel = useCallback(() => {
    setState((prev) => {
      const next = prev === 'collapsed' ? 'expanded' : 'collapsed';
      onToggle?.(next === 'expanded');
      return next;
    });
  }, [onToggle]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    onSend?.(text);
    setInputText('');
  }, [inputText, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Drag handling
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }
      setPosition({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const handleEnd = () => {
      if (dragRef.current && !dragRef.current.moved) {
        togglePanel();
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
  }, [togglePanel]);

  // Default position: bottom-right
  const ballStyle: React.CSSProperties = position.x >= 0
    ? { position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }
    : { position: 'fixed', right: 24, bottom: 100, zIndex: 1000 };

  return (
    <>
      {/* Floating Ball */}
      <div
        ref={ballRef}
        data-testid="floating-assistant-ball"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          ...ballStyle,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          color: '#fff',
          display: state === 'collapsed' ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(26, 95, 180, 0.35)',
          transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: hasNewMessage ? 'scale(1.15)' : 'scale(1)',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <RobotOutlined style={{ fontSize: 22 }} />
        {hasNewMessage && (
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#DC4444',
            border: '2px solid #fff',
          }} />
        )}
      </div>

      {/* Expanded Panel */}
      {state === 'expanded' && (
        <div
          data-testid="floating-assistant-panel"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 100,
            width: 340,
            maxHeight: 480,
            borderRadius: 16,
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ fontSize: 18 }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>灵山数字导览员</span>
            </div>
            <button
              onClick={togglePanel}
              aria-label="关闭"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseOutlined />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 200,
            maxHeight: 300,
          }}>
            {messages.length === 0 && (
              <div style={{
                color: 'var(--text-tertiary)',
                fontSize: 13,
                textAlign: 'center',
                padding: '24px 0',
              }}>
                你好！我是灵山胜境的数字导览员，有什么可以帮你的？
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : '#F0F4FF',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px 12px',
            borderTop: '1px solid var(--border-light)',
          }}>
            <input
              data-testid="assistant-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题..."
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
              data-testid="assistant-voice-btn"
              onClick={onVoiceStart}
              aria-label="语音输入"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#F0F4FF',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              <AudioOutlined />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes assistantSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default FloatingAssistant;
