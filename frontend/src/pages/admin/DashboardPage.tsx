import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { TeamOutlined, MessageOutlined, SmileOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import MetricsCard from '../../components/admin/MetricsCard';
import HotQuestions from '../../components/admin/HotQuestions';
import RealtimeMonitor from '../../components/admin/RealtimeMonitor';
import GlassCard from '../../components/admin/GlassCard';
import AnimatedNumber from '../../components/admin/AnimatedNumber';
import PageTransition from '../../components/admin/PageTransition';
import {
  getOverview,
  getTopQuestions,
  type OverviewMetrics,
  type TopQuestionItem,
} from '../../api/analytics';

const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = false; // web-only
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ov, tq] = await Promise.all([
          getOverview(),
          getTopQuestions(10),
        ]);
        setOverview(ov);
        setTopQuestions(tq);
      } catch (err: any) {
        message.error('加载数据失败: ' + (err?.message || '未知错误'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ov = await getOverview();
        setOverview(ov);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
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

  const hotQuestions = topQuestions.map((q, i) => ({
    id: `q-${i}`,
    question: q.question,
    count: q.count,
    trend: 'stable' as const,
  }));

  const realtimeData = overview
    ? {
        activeUsers: overview.uniqueSessions,
        messagesPerMinute: Math.max(1, Math.round(overview.todayInteractions / 60)),
        avgResponseTime: Math.round(overview.avgLatencyMs),
        sentimentScore: overview.avgSentimentScore,
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      data-testid="dashboard-page"
      style={{
        padding: isMobile ? '16px' : '28px',
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: isFullscreen ? '100vh' : undefined,
      }}
    >
      <PageTransition>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '28px',
        }}>
          <h1 className="font-serif" style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
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
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              borderRadius: 12,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '18px',
              transition: 'all 200ms',
              backdropFilter: 'blur(12px)',
            }}
          >
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '16px' : '28px',
            }}>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="今日交互"
                  value={<AnimatedNumber value={overview?.todayInteractions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<TeamOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="活跃会话"
                  value={<AnimatedNumber value={overview?.uniqueSessions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<MessageOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="平均情感分"
                  value={<AnimatedNumber value={overview?.avgSentimentScore ?? 0} decimals={2} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="stable"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="FAQ命中率"
                  value={<AnimatedNumber value={((overview?.faqHitRate ?? 0) * 100)} decimals={0} suffix="%" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
            }}>
              <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <RealtimeMonitor data={realtimeData} />
              </GlassCard>
              <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <HotQuestions questions={hotQuestions} onQuestionClick={handleQuestionClick} />
              </GlassCard>
            </div>
          </>
        )}
      </PageTransition>
    </div>
  );
};

export default DashboardPage;
