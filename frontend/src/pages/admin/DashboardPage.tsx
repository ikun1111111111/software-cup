import React, { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { TeamOutlined, MessageOutlined, SmileOutlined } from '@ant-design/icons';
import MetricsCard from '../../components/admin/MetricsCard';
import HotQuestions from '../../components/admin/HotQuestions';
import RealtimeMonitor from '../../components/admin/RealtimeMonitor';
import HeatmapChart from '../../components/admin/HeatmapChart';
import SealCard from '../../components/admin/SealCard';
import PaperPanel from '../../components/admin/PaperPanel';
import AnimatedNumber from '../../components/admin/AnimatedNumber';
import PageTransition from '../../components/admin/PageTransition';
import {
  getOverview,
  getTopQuestions,
  getHeatmap,
  type OverviewMetrics,
  type TopQuestionItem,
  type HeatmapItem,
} from '../../api/analytics';

const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = false; // web-only

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ov, tq, hm] = await Promise.all([
          getOverview(),
          getTopQuestions(10),
          getHeatmap(),
        ]);
        setOverview(ov);
        setTopQuestions(tq);
        setHeatmapData(hm);
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
      data-testid="dashboard-page"
      className="animate-scroll-unfold"
      style={{
        padding: isMobile ? '16px' : '28px',
      }}
    >
      <PageTransition>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '28px',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-serif)',
          }}>
            数据大屏
          </h1>
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
              <SealCard size="sm" color="vermilion">
                <MetricsCard
                  title="今日交互"
                  value={<AnimatedNumber value={overview?.todayInteractions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<TeamOutlined />}
                  color="var(--accent)"
                />
              </SealCard>
              <SealCard size="sm" color="vermilion">
                <MetricsCard
                  title="活跃会话"
                  value={<AnimatedNumber value={overview?.uniqueSessions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<MessageOutlined />}
                  color="var(--accent)"
                />
              </SealCard>
              <SealCard size="sm" color="vermilion">
                <MetricsCard
                  title="平均情感分"
                  value={<AnimatedNumber value={overview?.avgSentimentScore ?? 0} decimals={2} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="stable"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </SealCard>
              <SealCard size="sm" color="vermilion">
                <MetricsCard
                  title="FAQ命中率"
                  value={<AnimatedNumber value={((overview?.faqHitRate ?? 0) * 100)} decimals={0} suffix="%" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </SealCard>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
            }}>
              <PaperPanel style={{ flex: 1 }}>
                <RealtimeMonitor data={realtimeData} />
              </PaperPanel>
              <PaperPanel style={{ flex: 1 }}>
                <HotQuestions questions={hotQuestions} onQuestionClick={handleQuestionClick} />
              </PaperPanel>
            </div>

            <PaperPanel title="交互时段热力图" style={{ marginTop: isMobile ? '12px' : '20px' }}>
              <HeatmapChart data={heatmapData} />
            </PaperPanel>
          </>
        )}
      </PageTransition>
    </div>
  );
};

export default DashboardPage;
