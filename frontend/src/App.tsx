import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { DigitalHumanProvider, type DigitalHumanPose } from './components/tourist/DigitalHumanProvider';
import { useLargeScreen } from './hooks/useLargeScreen';

const ChatPage = React.lazy(() => import('./pages/tourist/ChatPage'));
const MobileEntryPage = React.lazy(() => import('./pages/tourist/MobileEntryPage'));
const RecommendPage = React.lazy(() => import('./pages/tourist/RecommendPage'));
const HistoryExplore = React.lazy(() => import('./pages/tourist/HistoryExplore'));
const StoryPage = React.lazy(() => import('./pages/tourist/StoryPage'));
const SpotSwitchPage = React.lazy(() => import('./pages/tourist/SpotSwitchPage'));
const KnowledgePage = React.lazy(() => import('./pages/admin/KnowledgePage'));
const AvatarPage = React.lazy(() => import('./pages/admin/AvatarPage'));
const ReportPage = React.lazy(() => import('./pages/admin/ReportPage'));
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const BehaviorPage = React.lazy(() => import('./pages/admin/BehaviorPage'));
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const TouristDockNav = React.lazy(() => import('./components/tourist/TouristDockNav'));
const MobileBridgeQRCode = React.lazy(() => import('./components/tourist/MobileBridgeQRCode'));

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
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Heiti SC', sans-serif",
  },
};

const PageFallback: React.FC = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--text-secondary)',
      background: 'rgba(247,245,240,0.7)',
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    正在进入景区导览…
  </div>
);

function getThemeByHour(hour: number): string {
  if (hour >= 6 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isSpotSwitch = location.pathname === '/spots';
  const isMobileEntry = location.pathname === '/mobile';

  useLargeScreen();

  React.useEffect(() => {
    if (isAdmin) {
      document.documentElement.setAttribute('data-theme', 'dawn');
    } else {
      document.documentElement.setAttribute('data-theme', getThemeByHour(new Date().getHours()));
    }
  }, [isAdmin]);

  const digitalHumanPose: DigitalHumanPose = React.useMemo(() => {
    if (location.pathname === '/chat') return 'kiosk-stage';
    if (location.pathname === '/story') return 'left-stage';
    if (['/history', '/recommend'].includes(location.pathname)) return 'left';
    return 'center';
  }, [location.pathname]);

  const appContent = (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/mobile" element={<MobileEntryPage />} />
          <Route path="/spots" element={<SpotSwitchPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/history" element={<HistoryExplore />} />
          <Route path="/story" element={<StoryPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="avatar" element={<AvatarPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="behavior" element={<BehaviorPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <div
        id="global-bg"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#F7F5F0',
          backgroundImage: isAdmin
            ? `var(--texture-paper), linear-gradient(180deg, rgba(247,245,240,0.72) 0%, rgba(247,245,240,0.54) 100%)`
            : `var(--texture-paper), linear-gradient(180deg, rgba(247,245,240,0.55) 0%, rgba(247,245,240,0.42) 50%, rgba(247,245,240,0.55) 100%), url('/image/AigcAssets(3).png')`,
          backgroundSize: isAdmin ? '100px 100px, 100% 100%' : '100px 100px, 100% 100%, cover',
          backgroundPosition: 'center, center, center center',
          backgroundRepeat: 'repeat, no-repeat, no-repeat',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {!isAdmin && !['/chat', '/history', '/spots', '/mobile'].includes(location.pathname) && (
        <Suspense fallback={null}>
          <TouristDockNav />
        </Suspense>
      )}
      {!isAdmin && !isMobileEntry && (
        <Suspense fallback={null}>
          <MobileBridgeQRCode />
        </Suspense>
      )}
    </div>
  );

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      {isAdmin || isSpotSwitch || isMobileEntry ? appContent : (
        <DigitalHumanProvider
          pose={digitalHumanPose}
          sceneVariant={location.pathname === '/chat' ? 'zen' : undefined}
          hideSceneBackground={location.pathname === '/chat'}
        >
          {appContent}
        </DigitalHumanProvider>
      )}
    </ConfigProvider>
  );
}

export default App;
