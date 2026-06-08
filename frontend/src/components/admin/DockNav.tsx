import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  RobotOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const navItems = [
  { to: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据大屏' },
  { to: '/admin', icon: <DatabaseOutlined />, label: '知识库' },
  { to: '/admin/avatar', icon: <RobotOutlined />, label: '数字人' },
  { to: '/admin/report', icon: <FileTextOutlined />, label: '报告' },
];

const DockNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 16px',
        height: 56,
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 28,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.to || (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 14,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {active && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default DockNav;
