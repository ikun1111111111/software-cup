import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  MessageOutlined,
  CompassOutlined,
  DatabaseOutlined,
  RobotOutlined,
  LineChartOutlined,
  DashboardOutlined,
  HistoryOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import HomePage from './pages/tourist/HomePage';
import ChatPage from './pages/tourist/ChatPage';
import RecommendPage from './pages/tourist/RecommendPage';
import TouristDashboard from './pages/tourist/TouristDashboard';
import AttractionList from './pages/tourist/AttractionList';
import AttractionDetail from './pages/tourist/AttractionDetail';
import HistoryExplore from './pages/tourist/HistoryExplore';
import Leaderboard from './pages/tourist/Leaderboard';
import KnowledgePage from './pages/admin/KnowledgePage';
import AvatarPage from './pages/admin/AvatarPage';
import ReportPage from './pages/admin/ReportPage';
import DashboardPage from './pages/admin/DashboardPage';
import NotFound from './pages/NotFound';
import FloatingAssistant from './components/DigitalHuman/FloatingAssistant';
import InkEntryOverlay from './components/DigitalHuman/InkEntryOverlay';
import PushCard from './components/Notification/PushCard';
import { usePushNotification } from './hooks/usePushNotification';
import { FloatingParticles } from './components/ui';

const theme = {
  token: {
    colorPrimary: '#6A9C89',
    colorSuccess: '#2D8B57',
    colorWarning: '#C8A951',
    colorError: '#C84B31',
    colorBgLayout: '#F7F5F0',
    colorBgContainer: '#FFFFFF',
    colorText: '#1A1614',
    colorTextSecondary: '#5C554C',
    borderRadius: 10,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  },
};

/* ═══════════════════════════════════════
   统一导航 Header — Logo + 页面导航合并
   ═══════════════════════════════════════ */

interface NavLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const touristLinks: NavLink[] = [
  { to: '/', label: '首页', icon: <MessageOutlined /> },
  { to: '/chat', label: '对话', icon: <MessageOutlined /> },
  { to: '/explore', label: '探索导览', icon: <CompassOutlined /> },
  { to: '/attractions', label: '景点', icon: <EnvironmentOutlined /> },
  { to: '/recommend', label: '路线', icon: <CompassOutlined /> },
  { to: '/history', label: '时空', icon: <HistoryOutlined /> },
  { to: '/leaderboard', label: '榜单', icon: <TrophyOutlined /> },
];

const adminLinks: NavLink[] = [
  { to: '/admin', label: '知识库', icon: <DatabaseOutlined />, exact: true },
  { to: '/admin/avatar', label: '数字人', icon: <RobotOutlined /> },
  { to: '/admin/report', label: '报告', icon: <LineChartOutlined /> },
  { to: '/admin/dashboard', label: '大屏', icon: <DashboardOutlined /> },
];

function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 60);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Determine if header should be transparent (home hero)
  const transparent = isHome && !scrolled;
  const links = isAdmin ? adminLinks : touristLinks;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 20px',
      height: 60,
      background: transparent
        ? 'rgba(247, 245, 240, 0.75)'
        : 'rgba(247, 245, 240, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: transparent
        ? '1px solid rgba(192, 188, 182, 0.2)'
        : '1px solid rgba(192, 188, 182, 0.35)',
      boxShadow: transparent
        ? 'none'
        : '0 1px 8px rgba(26, 22, 20, 0.04)',
      transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontWeight: 700,
        fontSize: 16,
        color: 'var(--color-primary)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        letterSpacing: '0.5px',
        flexShrink: 0,
        transition: 'color 300ms ease',
      }}>
        <div className="logo-seal">
          <span>灵</span>
        </div>
        <span className="hide-mobile" style={{
          fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
          letterSpacing: '0.1em',
        }}>
          灵山胜境
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <nav style={{
        display: 'flex',
        gap: 2,
        marginLeft: 24,
        flex: 1,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }} className="hide-mobile">
        {links.map((link) => {
          const active = link.exact
            ? location.pathname === link.to
            : link.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(link.to);

          return (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--color-primary-bg)' : 'transparent',
                border: active
                  ? '1px solid rgba(106, 156, 137, 0.15)'
                  : '1px solid transparent',
                transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: active ? "'ZCOOL XiaoWei', 'Noto Serif SC', serif" : 'inherit',
                letterSpacing: active ? '0.05em' : 'normal',
              }}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin / Tourist toggle (desktop) */}
      <div className="hide-mobile" style={{ flexShrink: 0, marginLeft: 'auto' }}>
        <Link
          to={isAdmin ? '/' : '/admin'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            transition: 'all 200ms ease',
          }}
        >
          {isAdmin ? <MessageOutlined /> : <DashboardOutlined />}
          {isAdmin ? '游客端' : '管理后台'}
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="hide-desktop"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 20,
          cursor: 'pointer',
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 200ms',
        }}
      >
        {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          background: 'rgba(247, 245, 240, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-light)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          boxShadow: '0 8px 24px rgba(26,22,20,0.08)',
          animation: 'fadeIn 200ms ease-out',
        }}>
          {links.map((link) => {
            const active = link.exact
              ? location.pathname === link.to
              : link.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--color-primary-bg)' : 'transparent',
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
          <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
          <Link
            to={isAdmin ? '/' : '/admin'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              fontSize: 14,
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {isAdmin ? <MessageOutlined /> : <DashboardOutlined />}
            {isAdmin ? '切换到游客端' : '切换到管理后台'}
          </Link>
        </div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════
   AdminNav — kept for admin dashboard page
   ═══════════════════════════════════════ */
function AdminNav() {
  const location = useLocation();
  const links = [
    { to: '/admin', label: '知识库管理', icon: <DatabaseOutlined />, exact: true },
    { to: '/admin/avatar', label: '数字人配置', icon: <RobotOutlined /> },
    { to: '/admin/report', label: '感受度报告', icon: <LineChartOutlined /> },
    { to: '/admin/dashboard', label: '数据大屏', icon: <DashboardOutlined /> },
  ];

  return (
    <div className="glass-surface" style={{
      display: 'flex',
      gap: '6px',
      padding: '10px var(--container-padding)',
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
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
              border: active ? '1px solid rgba(106, 156, 137, 0.15)' : '1px solid transparent',
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
  const isAdmin = location.pathname.startsWith('/admin');

  const { notification: pushNotification, handleListen, handleNavigate, dismiss: dismissPush } = usePushNotification({
    userId: 'guest',
    enabled: !isAdmin && !isDashboard,
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDashboard ? 'dark' : 'light'
    );
    return () => {
      document.documentElement.setAttribute('data-theme', 'light');
    };
  }, [isDashboard]);

  // 视差滚动 — 远山底图以 0.3x 速度跟随滚动
  useEffect(() => {
    if (isAdmin) return;
    const bgEl = document.getElementById('global-bg');
    if (!bgEl) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      bgEl.style.backgroundPosition = `center, center, center calc(75% + ${scrollY * 0.3}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAdmin]);

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        transition: 'background-color 300ms',
      }}>
        <Header />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/explore" element={<TouristDashboard />} />
          <Route path="/attractions" element={<AttractionList />} />
          <Route path="/attractions/:spotId" element={<AttractionDetail />} />
          <Route path="/history" element={<HistoryExplore />} />
          <Route path="/leaderboard" element={<Leaderboard />} />

          <Route path="/admin" element={<><AdminNav /><KnowledgePage /></>} />
          <Route path="/admin/avatar" element={<><AdminNav /><AvatarPage /></>} />
          <Route path="/admin/report" element={<><AdminNav /><ReportPage /></>} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* 全局背景 — 宣纸纹理 + 淡墨山景（视差滚动） */}
        <div
          id="global-bg"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#F7F5F0',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"), linear-gradient(180deg, rgba(247,245,240,0.95) 0%, rgba(247,245,240,0.90) 50%, rgba(247,245,240,0.95) 100%), url('/image/AigcAssets(3).png')`,
            backgroundSize: '100px 100px, 100% 100%, cover',
            backgroundPosition: 'center, center, center 75%',
            backgroundRepeat: 'repeat, no-repeat, no-repeat',
            backgroundAttachment: 'scroll, scroll, fixed',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />

        {/* 飘落粒子 — 花瓣 + 银杏叶（仅主页显示） */}
        {location.pathname === '/' && <FloatingParticles count={20} />}

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
