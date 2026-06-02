import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ConfigProvider, Drawer } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  MessageOutlined,
  CompassOutlined,
  QrcodeOutlined,
  DatabaseOutlined,
  RobotOutlined,
  LineChartOutlined,
  DashboardOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import ChatPage from './pages/tourist/ChatPage';
import RecommendPage from './pages/tourist/RecommendPage';
import QRScan from './pages/tourist/QRScan';
import KnowledgePage from './pages/admin/KnowledgePage';
import AvatarPage from './pages/admin/AvatarPage';
import ReportPage from './pages/admin/ReportPage';
import DashboardPage from './pages/admin/DashboardPage';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: '游客端', icon: <MessageOutlined /> },
    { to: '/admin', label: '管理后台', icon: <DashboardOutlined /> },
  ];

  return (
    <nav style={{
      display: 'flex',
      gap: '16px',
      padding: isMobile ? '0 16px' : '0 24px',
      height: 56,
      backgroundColor: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-light)',
      alignItems: 'center',
      boxShadow: '0 1px 4px rgba(26, 22, 20, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-sticky)' as any,
    }}>
      <Link to="/" style={{
        fontWeight: 700,
        fontSize: isMobile ? '15px' : '17px',
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

      {/* Desktop nav */}
      <div className="hide-mobile" style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
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

      {/* Mobile hamburger */}
      <button
        className="hide-desktop"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label="菜单"
        style={{
          marginLeft: 'auto',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '20px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
      </button>

      {/* Mobile drawer */}
      <Drawer
        placement="right"
        open={drawerOpen && isMobile}
        onClose={() => setDrawerOpen(false)}
        width={260}
        styles={{ body: { padding: 0 } }}
        closable={false}
      >
        <div style={{ padding: '16px 0' }}>
          {navLinks.map((link) => {
            const active = link.to === '/'
              ? !isAdmin
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 24px',
                  textDecoration: 'none',
                  color: active ? 'var(--color-primary)' : 'var(--text-primary)',
                  backgroundColor: active ? 'var(--color-primary-bg)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: '15px',
                  transition: 'all 200ms',
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>
      </Drawer>
    </nav>
  );
}

function TouristNav() {
  const location = useLocation();

  const links = [
    { to: '/', label: '对话', icon: <MessageOutlined /> },
    { to: '/recommend', label: '推荐路线', icon: <CompassOutlined /> },
    { to: '/qr-scan', label: '扫码定位', icon: <QrcodeOutlined /> },
  ];

  return (
    <div className="hide-mobile" style={{
      display: 'flex',
      gap: '6px',
      padding: '10px 24px',
      backgroundColor: 'var(--surface-card)',
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

function TouristBottomNav() {
  const location = useLocation();

  const links = [
    { to: '/', label: '对话', icon: <MessageOutlined /> },
    { to: '/recommend', label: '推荐', icon: <CompassOutlined /> },
    { to: '/qr-scan', label: '扫码', icon: <QrcodeOutlined /> },
  ];

  return (
    <nav className="hide-desktop safe-area-bottom" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      backgroundColor: 'var(--surface-card)',
      borderTop: '1px solid var(--border-light)',
      zIndex: 'var(--z-sticky)' as any,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {links.map((link) => {
        const active = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '8px 0',
              textDecoration: 'none',
              color: active ? 'var(--color-primary)' : 'var(--text-tertiary)',
              fontSize: '11px',
              fontWeight: active ? 600 : 400,
              transition: 'color 200ms',
              minHeight: 48,
            }}
          >
            <span style={{ fontSize: '20px' }}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminNav() {
  const location = useLocation();

  const links = [
    { to: '/admin', label: '知识库管理', icon: <DatabaseOutlined />, exact: true },
    { to: '/admin/avatar', label: '数字人配置', icon: <RobotOutlined /> },
    { to: '/admin/report', label: '感受度报告', icon: <LineChartOutlined /> },
    { to: '/admin/dashboard', label: '数据大屏', icon: <DashboardOutlined /> },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      padding: '10px var(--container-padding)',
      backgroundColor: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-light)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {links.map((link) => {
        const active = link.exact
          ? location.pathname === link.to
          : location.pathname.startsWith(link.to);
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
              whiteSpace: 'nowrap',
              flexShrink: 0,
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
  const isDashboard = location.pathname === '/admin/dashboard';

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDashboard ? 'dark' : 'light'
    );
    return () => {
      document.documentElement.setAttribute('data-theme', 'light');
    };
  }, [isDashboard]);

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-bg)',
        color: 'var(--text-primary)',
        transition: 'background-color 300ms',
      }}>
        <NavBar />

        <Routes>
          {/* Tourist routes */}
          <Route path="/" element={
            <>
              <TouristNav />
              <ChatPage />
              <TouristBottomNav />
            </>
          } />
          <Route path="/recommend" element={
            <>
              <TouristNav />
              <RecommendPage />
              <TouristBottomNav />
            </>
          } />
          <Route path="/qr-scan" element={
            <>
              <TouristNav />
              <QRScan />
              <TouristBottomNav />
            </>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={<><AdminNav /><KnowledgePage /></>} />
          <Route path="/admin/avatar" element={<><AdminNav /><AvatarPage /></>} />
          <Route path="/admin/report" element={<><AdminNav /><ReportPage /></>} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ConfigProvider>
  );
}

export default App;
