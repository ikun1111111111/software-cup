import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  DashboardOutlined,
  MenuOutlined,
  CloseOutlined,
  DatabaseOutlined,
  RobotOutlined,
  LineChartOutlined,
  MessageOutlined,
} from '@ant-design/icons';

import HomePage from './pages/tourist/HomePage';
import AttractionList from './pages/tourist/AttractionList';
import AttractionDetail from './pages/tourist/AttractionDetail';
import NotFound from './pages/NotFound';
import FloatingAssistant from './components/DigitalHuman/FloatingAssistant';
import InkEntryOverlay from './components/DigitalHuman/InkEntryOverlay';
import PushCard from './components/Notification/PushCard';
import { usePushNotification } from './hooks/usePushNotification';
import { FloatingParticles } from './components/ui';

// 路由级代码分割 — 非首屏页面延迟加载
const RecommendPage = React.lazy(() => import('./pages/tourist/RecommendPage'));
const TouristDashboard = React.lazy(() => import('./pages/tourist/TouristDashboard'));
const HistoryExplore = React.lazy(() => import('./pages/tourist/HistoryExplore'));
const Leaderboard = React.lazy(() => import('./pages/tourist/Leaderboard'));
const VRMDemo = React.lazy(() => import('./pages/tourist/VRMDemo'));
const MemoryPage = React.lazy(() => import('./pages/tourist/MemoryPage'));
const MapGuidePage = React.lazy(() => import('./pages/tourist/MapGuidePage'));
const KnowledgePage = React.lazy(() => import('./pages/admin/KnowledgePage'));
const AvatarPage = React.lazy(() => import('./pages/admin/AvatarPage'));
const SpeakingDemo = React.lazy(() => import('./pages/admin/SpeakingDemo'));
const ReportPage = React.lazy(() => import('./pages/admin/ReportPage'));
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));

// 路由加载占位
const RouteLoading: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: 2,
  }}>
    墨韵渐染...
  </div>
);

/* — 禅意导航图标 — */
const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' } as const;
const stroke = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** 胜境启扉 — 门扉 */
const IconGate = () => (
  <svg {...iconProps}>
    <path d="M5 20V4C5 4 6 3 8 3C10 3 11 4 12 4C13 4 14 3 16 3C18 3 19 4 19 4V20" {...stroke} strokeWidth={1.6} />
    <path d="M12 4V20" {...stroke} strokeWidth={1.4} />
    <path d="M3 20H21" {...stroke} strokeWidth={1.8} />
    <path d="M9 14C9 14 10 12 12 12C14 12 15 14 15 14" {...stroke} strokeWidth={1.2} opacity={0.6} />
  </svg>
);

/** 禅语问讯 — 祥云对话 */
const IconChat = () => (
  <svg {...iconProps}>
    <path d="M5 16C5 16 3 14 5 11C7 8 10 9 12 8C14 7 17 5 19 8C21 11 19 14 16 15C16 15 16 18 13 19L11 22L10 19C7 18 5 16 5 16Z" {...stroke} strokeWidth={1.4} />
  </svg>
);

/** 云游胜境 — 祥云 */
const IconCloud = () => (
  <svg {...iconProps}>
    <path d="M5 15C5 15 2 13 4 10C6 7 9 8 11 7C13 6 15 4 18 6C20 8 20 11 18 12C18 12 19 14 17 15H5Z" {...stroke} strokeWidth={1.4} />
    <path d="M8 18L6 21" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M12 17L12 21" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M16 18L18 20" {...stroke} strokeWidth={1.0} opacity={0.5} />
  </svg>
);

/** 莲台宝地 — 莲花 */
const IconLotus = () => (
  <svg {...iconProps}>
    <path d="M12 16C12 16 7 12 7 8C7 6 9 5 12 7" {...stroke} strokeWidth={1.3} />
    <path d="M12 16C12 16 17 12 17 8C17 6 15 5 12 7" {...stroke} strokeWidth={1.3} />
    <path d="M12 16C12 16 5 13 6 9C6.5 7 8.5 6.5 12 8" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M12 16C12 16 19 13 18 9C17.5 6.5 15.5 6.5 12 8" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M12 7V4" {...stroke} strokeWidth={1.0} opacity={0.4} />
    <path d="M12 18C10 19 8 20 7 20H17C16 20 14 19 12 18Z" {...stroke} strokeWidth={1.2} opacity={0.6} />
  </svg>
);

/** 禅径通幽 — 曲径 */
const IconPath = () => (
  <svg {...iconProps}>
    <path d="M12 21C12 21 10 18 10 15C10 12 14 10 14 7C14 5 13 3 13 3" {...stroke} strokeWidth={1.4} />
    <path d="M9 6L12 3L15 6" {...stroke} strokeWidth={1.2} opacity={0.5} />
    <path d="M8 21H16" {...stroke} strokeWidth={1.4} />
    <circle cx="12" cy="13" r="1" fill="currentColor" opacity={0.4} />
  </svg>
);

/** 岁月禅痕 — 月牙 */
const IconMoon = () => (
  <svg {...iconProps}>
    <path d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C12 4 12 9 16 12C16 12 18.5 12 20 12Z" {...stroke} strokeWidth={1.4} />
  </svg>
);

/** 胜境甄选 — 宝石 */
const IconGem = () => (
  <svg {...iconProps}>
    <path d="M6 9L12 3L18 9" {...stroke} strokeWidth={1.4} />
    <path d="M6 9L3 15L12 21L21 15L18 9H6Z" {...stroke} strokeWidth={1.4} />
    <path d="M3 15L12 12L21 15" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M12 3V12" {...stroke} strokeWidth={1.0} opacity={0.5} />
  </svg>
);

/** 旅行记忆 — 书卷 */
const IconMemory = () => (
  <svg {...iconProps}>
    <path d="M4 4C4 4 6 3 8 3C10 3 12 4 12 4V20C12 20 10 19 8 19C6 19 4 20 4 20V4Z" {...stroke} strokeWidth={1.4} />
    <path d="M20 4C20 4 18 3 16 3C14 3 12 4 12 4V20C12 20 14 19 16 19C18 19 20 20 20 20V4Z" {...stroke} strokeWidth={1.4} />
    <path d="M7 8H10" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M14 8H17" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M7 12H10" {...stroke} strokeWidth={1.0} opacity={0.5} />
    <path d="M14 12H17" {...stroke} strokeWidth={1.0} opacity={0.5} />
  </svg>
);

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
  { to: '/', label: '胜境启扉', icon: <IconGate /> },
  { to: '/explore', label: '云游胜境', icon: <IconCloud /> },
  { to: '/attractions', label: '莲台宝地', icon: <IconLotus /> },
  { to: '/recommend', label: '禅径通幽', icon: <IconPath /> },
  { to: '/history', label: '岁月禅痕', icon: <IconMoon /> },
  { to: '/memory', label: '旅行记忆', icon: <IconMemory /> },
];

const adminLinks: NavLink[] = [
  { to: '/admin/dashboard', label: '大屏', icon: <DashboardOutlined />, exact: true },
  { to: '/admin/knowledge', label: '知识库', icon: <DatabaseOutlined /> },
  { to: '/admin/avatar', label: '数字人', icon: <RobotOutlined /> },
  { to: '/admin/report', label: '报告', icon: <LineChartOutlined /> },
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
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 0,
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
          to={isAdmin ? '/' : '/admin/dashboard'}
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
          top: 'calc(60px + env(safe-area-inset-top, 0px))',
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
            to={isAdmin ? '/' : '/admin/dashboard'}
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

function getThemeByHour(hour: number): string {
  if (hour >= 6 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.setAttribute('data-theme', 'dawn');
    } else {
      document.documentElement.setAttribute('data-theme', getThemeByHour(new Date().getHours()));
    }
  }, [isAdmin]);

  const { notification: pushNotification, handleListen, handleNavigate, dismiss: dismissPush } = usePushNotification({
    userId: 'guest',
    enabled: !isAdmin,
  });

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
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <Header />

        <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/explore" element={<TouristDashboard />} />
          <Route path="/attractions" element={<AttractionList />} />
          <Route path="/attractions/:spotId" element={<AttractionDetail />} />
          <Route path="/history" element={<HistoryExplore />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/vrm-demo" element={<VRMDemo />} />
          <Route path="/map" element={<MapGuidePage />} />

          <Route path="/admin/*" element={
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="avatar" element={<AvatarPage />} />
              <Route path="speaking-demo" element={<SpeakingDemo />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
            </Routes>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>

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
