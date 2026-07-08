import React, { useEffect, useMemo, useState } from 'react';

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayNames[date.getDay()]}`;
}

const ChatSideInfo: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(
    () => [
      { label: '天气', value: '☀️ 28°C', detail: '晴 · 适宜礼佛观景' },
      { label: '拥挤度', value: '🟢 舒适', detail: '推荐慢行游览' },
    ],
    []
  );

  return (
    <aside
      className="chat-side-info-enter"
      aria-label="景区实时信息"
      style={{
        position: 'fixed',
        left: 32,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 105,
        width: 176,
        padding: '20px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.45)',
        border: '1px solid rgba(42,37,32,0.06)',
        boxShadow: '0 16px 44px rgba(42,37,32,0.06)',
        backdropFilter: 'blur(16px) saturate(120%)',
        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        color: '#2A2520',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif), 'Noto Serif SC', serif",
          fontSize: 32,
          lineHeight: 1,
          letterSpacing: '0.04em',
          color: '#2A2520',
        }}
      >
        {formatTime(now)}
      </div>
      <div
        style={{
          marginTop: 8,
          marginBottom: 18,
          fontFamily: "var(--font-calligraphy), 'KaiTi', serif",
          fontSize: 13,
          color: 'rgba(42,37,32,0.48)',
        }}
      >
        {formatDate(now)}
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {items.map((item) => (
          <div key={item.label}>
            <div
              style={{
                fontFamily: "var(--font-calligraphy), 'KaiTi', serif",
                fontSize: 12,
                color: 'rgba(42,37,32,0.38)',
                marginBottom: 4,
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: 14, color: '#2A2520', lineHeight: 1.5 }}>{item.value}</div>
            <div style={{ marginTop: 2, fontSize: 11, color: 'rgba(42,37,32,0.42)' }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .chat-side-info-enter {
          animation: chatSideInfoEnter 620ms cubic-bezier(0.22, 1, 0.36, 1) 280ms both;
        }
        @keyframes chatSideInfoEnter {
          from { opacity: 0; transform: translateY(-50%) translateX(-18px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </aside>
  );
};

export default ChatSideInfo;
