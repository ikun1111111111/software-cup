import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

const stroke = {
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.5,
} as const;

const IconChat = () => (
  <svg {...iconProps}>
    <path
      d="M5 16C5 16 3 14 5 11C7 8 10 9 12 8C14 7 17 5 19 8C21 11 19 14 16 15C16 15 16 18 13 19L11 22L10 19C7 18 5 16 5 16Z"
      {...stroke}
    />
  </svg>
);

const IconMoon = () => (
  <svg {...iconProps}>
    <path
      d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C12 4 12 9 16 12C16 12 18.5 12 20 12Z"
      {...stroke}
    />
  </svg>
);

const IconPath = () => (
  <svg {...iconProps}>
    <path d="M12 21C12 21 10 18 10 15C10 12 14 10 14 7C14 5 13 3 13 3" {...stroke} />
    <path d="M9 6L12 3L15 6" {...stroke} strokeWidth={1.1} opacity={0.5} />
    <path d="M8 21H16" {...stroke} />
    <circle cx="12" cy="13" r="1" fill="currentColor" opacity={0.4} />
  </svg>
);

const IconScroll = () => (
  <svg {...iconProps}>
    <rect x="5" y="3" width="14" height="18" rx="2" {...stroke} />
    <path d="M8 8H16" {...stroke} strokeWidth={1.1} opacity={0.5} />
    <path d="M8 12H16" {...stroke} strokeWidth={1.1} opacity={0.5} />
    <path d="M8 16H13" {...stroke} strokeWidth={1.1} opacity={0.5} />
  </svg>
);

interface DockItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  scene: string;
}

const dockItems: DockItem[] = [
  { to: '/chat', label: '问我', icon: <IconChat />, scene: 'chat' },
  { to: '/history', label: '历史', icon: <IconMoon />, scene: 'history' },
  { to: '/recommend', label: '路线', icon: <IconPath />, scene: 'route' },
  { to: '/story', label: '剧场', icon: <IconScroll />, scene: 'story' },
];

const TouristDockNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        height: 56,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        padding: '0 32px',
        background: 'rgba(247,245,240,0.78)',
        borderBottom: '1px solid rgba(42,37,32,0.05)',
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        boxShadow: '0 8px 30px rgba(42,37,32,0.035)',
      }}
    >
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          width: 'fit-content',
          color: '#2A2520',
          textDecoration: 'none',
          fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '0.14em',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#C84B31',
            boxShadow: '0 0 0 5px rgba(200,75,49,0.08)',
          }}
        />
        灵山胜境
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'rgba(106,156,137,0.10)',
            color: '#6A9C89',
            fontSize: 11,
            letterSpacing: '0.06em',
            fontWeight: 500,
          }}
        >
          导览：小景
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {dockItems.map((item) => {
        const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 40,
              padding: '0 8px',
              color: active ? '#C84B31' : 'rgba(42,37,32,0.50)',
              textDecoration: 'none',
              background: 'transparent',
              border: 'none',
              transition: 'all 250ms cubic-bezier(0.22, 1, 0.36, 1)',
              fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
              fontSize: 13,
              letterSpacing: '0.08em',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = '#2A2520';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'rgba(42,37,32,0.50)';
            }}
          >
            <span style={{ display: 'flex', width: 20, height: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
            {active && (
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  bottom: 1,
                  height: 2,
                  borderRadius: 999,
                  background: '#C84B31',
                  boxShadow: '0 0 8px rgba(200,75,49,0.28)',
                }}
              />
            )}
          </Link>
        );
      })}
      </div>
    </nav>
  );
};

export default TouristDockNav;
