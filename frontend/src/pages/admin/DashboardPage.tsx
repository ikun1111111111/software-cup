import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TeamOutlined, MessageOutlined, SmileOutlined, StarOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import MetricsCard from '../../components/admin/MetricsCard';
import HotQuestions from '../../components/admin/HotQuestions';
import RealtimeMonitor from '../../components/admin/RealtimeMonitor';

interface DashboardData {
  totalVisitors: number;
  activeSessions: number;
  avgSentiment: number;
  satisfactionRate: number;
  hotQuestions: Array<{ id: string; question: string; count: number; trend: 'up' | 'down' | 'stable' }>;
}

const MOCK_DATA: DashboardData = {
  totalVisitors: 12580,
  activeSessions: 156,
  avgSentiment: 4.2,
  satisfactionRate: 0.92,
  hotQuestions: [
    { id: '1', question: '灵山大佛有多高？', count: 156, trend: 'up' },
    { id: '2', question: '景区开放时间是什么？', count: 132, trend: 'stable' },
    { id: '3', question: '怎么去梵宫？', count: 98, trend: 'up' },
  ],
};

const DashboardPage: React.FC = () => {
  const [data] = useState<DashboardData>(MOCK_DATA);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = false; // web-only
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleQuestionClick = useCallback((question: { id: string; question: string }) => {
    console.log('Question clicked:', question);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="dashboard-page"
      data-theme="dark"
      style={{
        padding: isMobile ? '16px' : '28px',
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: isFullscreen ? '100vh' : undefined,
        backgroundColor: 'var(--surface-bg)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '20px' : '28px',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '18px' : '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          数据大屏
        </h1>
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? '退出全屏' : '全屏模式'}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '18px',
            transition: 'all 200ms',
          }}
        >
          {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
      </div>

      {/* Metrics Grid */}
      <div data-testid="metrics-grid" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '12px' : '16px',
        marginBottom: isMobile ? '16px' : '28px',
      }}>
        <MetricsCard
          title="今日访客"
          value={data.totalVisitors}
          trend="up"
          trendValue="较昨日+12%"
          icon={<TeamOutlined />}
          color="#1A5FB4"
        />
        <MetricsCard
          title="活跃会话"
          value={data.activeSessions}
          trend="up"
          trendValue="较昨日+8%"
          icon={<MessageOutlined />}
          color="#2D8B57"
        />
        <MetricsCard
          title="平均情感分"
          value={data.avgSentiment.toFixed(1)}
          trend="stable"
          trendValue="与昨日持平"
          icon={<SmileOutlined />}
          color="#E8A838"
        />
        <MetricsCard
          title="满意度"
          value={`${(data.satisfactionRate * 100).toFixed(0)}%`}
          trend="up"
          trendValue="较昨日+2%"
          icon={<StarOutlined />}
          color="#8B5CF6"
        />
      </div>

      {/* Panels */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
      }}>
        <div style={{
          flex: 1,
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <RealtimeMonitor />
        </div>
        <div style={{
          flex: 1,
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <HotQuestions
            questions={data.hotQuestions}
            onQuestionClick={handleQuestionClick}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
