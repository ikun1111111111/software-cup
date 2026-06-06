import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const navItems = [
  { to: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据大屏' },
  { to: '/admin', icon: <DatabaseOutlined />, label: '知识库' },
  { to: '/admin/avatar', icon: <UserOutlined />, label: '数字人' },
  { to: '/admin/report', icon: <FileTextOutlined />, label: '报告' },
];

const ScrollNav: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname === to;
  };

  return (
    <nav
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        bottom: 0,
        width: hovered ? 180 : 64,
        backgroundColor: 'var(--ink-dark)',
        borderRight: '1px solid rgba(201, 169, 110, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 24,
        zIndex: 998,
        transition: 'width 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Seal logo */}
      <div
        style={{
          width: 40,
          height: 40,
          border: '2px solid var(--gold-leaf)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--gold-leaf)',
          flexShrink: 0,
          marginBottom: 32,
        }}
      >
        灵
      </div>

      {/* Nav items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderLeft: active ? '3px solid var(--vermilion)' : '3px solid transparent',
                cursor: 'pointer',
                color: active ? 'var(--gold-leaf)' : 'rgba(243, 239, 230, 0.55)',
                transition: 'color 200ms ease, border-color 200ms ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(243, 239, 230, 0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(243, 239, 230, 0.55)';
                }
              }}
            >
              <span style={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: hovered ? 1 : 0,
                  transition: 'opacity 200ms ease',
                  pointerEvents: 'none',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ScrollNav;
