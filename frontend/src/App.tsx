import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  MessageOutlined,
  CompassOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

import ChatPage from './pages/tourist/ChatPage';
import RecommendPage from './pages/tourist/RecommendPage';
import TouristDashboard from './pages/tourist/TouristDashboard';
import KnowledgePage from './pages/admin/KnowledgePage';
import AvatarPage from './pages/admin/AvatarPage';
import ReportPage from './pages/admin/ReportPage';
import DashboardPage from './pages/admin/DashboardPage';
import FloatingAssistant from './components/DigitalHuman/FloatingAssistant';
import InkEntryOverlay from './components/DigitalHuman/InkEntryOverlay';
import PushCard from './components/Notification/PushCard';
import { usePushNotification } from './hooks/usePushNotification';
import ScrollNav from './components/admin/ScrollNav';

const theme = {
  token: {
    colorPrimary: '#1A5FB4',
    colorSuccess: '#2D8B57',
    colorWarning: '#E8A838',
    colorError: '#DC4444',
    colorBgLayout: '#F8F6F2',
    colorBgContainer: '#FFFFFF',
    colorText: '#1A1614',
    colorTextSecondary: '#5C554C',
    borderRadius: 10,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  },
};

function NavBar() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const navLinks = [
    { to: '/', label: '游客端', icon: <MessageOutlined /> },
    { to: '/admin', label: '管理后台', icon: <DashboardOutlined /> },
  ];

  return (
    <nav className="glass-surface" style={{
      display: 'flex',
      gap: '16px',
      padding: '0 24px',
      height: 56,
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-light)',
      alignItems: 'center',
      boxShadow: '0 1px 4px rgba(26, 22, 20, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-sticky)' as any,
    }}>
      <Link to="/" style={{
        fontWeight: 700,
        fontSize: '17px',
        color: 'var(--color-primary)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        letterSpacing: '0.5px',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 800,
        }}>
          灵
        </span>
        智慧灵山胜境
      </Link>

      <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
        {navLinks.map((link) => {
          const active = link.to === '/'
            ? !isAdmin
            : location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 16px',
                backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TouristNav() {
  const location = useLocation();

  const links = [
    { to: '/', label: '对话', icon: <MessageOutlined /> },
    { to: '/explore', label: '探索导览', icon: <CompassOutlined /> },
    { to: '/recommend', label: '推荐路线', icon: <CompassOutlined /> },
  ];

  return (
    <div className="glass-surface" style={{
      display: 'flex',
      gap: '6px',
      padding: '10px 24px',
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-light)',
    }}>
      {links.map((link) => {
        const active = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            style={{
              padding: '7px 16px',
              backgroundColor: active ? 'var(--color-primary-bg)' : 'transparent',
              color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: active ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              border: active ? '1px solid rgba(26, 95, 180, 0.15)' : '1px solid transparent',
            }}
          >
            {link.icon}
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const { notification: pushNotification, handleListen, handleNavigate, dismiss: dismissPush } = usePushNotification({
    userId: 'guest',
    enabled: !isAdmin,
  });

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        transition: 'background-color 300ms',
      }}>
        <NavBar />

        <Routes>
          <Route path="/" element={
            <>
              <TouristNav />
              <ChatPage />
            </>
          } />
          <Route path="/recommend" element={
            <>
              <TouristNav />
              <RecommendPage />
            </>
          } />
          <Route path="/explore" element={
            <>
              <TouristNav />
              <TouristDashboard />
            </>
          } />

          <Route path="/admin/*" element={
            <>
              <ScrollNav />
              <div style={{ paddingLeft: 64 }}>
                <Routes>
                  <Route path="/" element={<KnowledgePage />} />
                  <Route path="avatar" element={<AvatarPage />} />
                  <Route path="report" element={<ReportPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                </Routes>
              </div>
            </>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: "url('/image/AigcAssets(3).png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 75%',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            zIndex: -1,
            opacity: 0.45,
          }}
        />

        <FloatingAssistant />

        {!isAdmin && <InkEntryOverlay />}

        {pushNotification && (
          <PushCard
            notification={pushNotification}
            onListen={handleListen}
            onNavigate={handleNavigate}
            onDismiss={dismissPush}
          />
        )}
      </div>
    </ConfigProvider>
  );
}

export default App;
