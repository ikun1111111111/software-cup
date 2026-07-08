import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUploadOutlined, FireOutlined, MobileOutlined, ReloadOutlined, RiseOutlined } from '@ant-design/icons';
import { message, Progress, Radio } from 'antd';
import PageTransition from '../../components/admin/PageTransition';
import PaperPanel from '../../components/admin/PaperPanel';
import SealCard from '../../components/admin/SealCard';
import InscriptionList from '../../components/admin/InscriptionList';
import DataVStage from '../../components/admin/DataVStage';
import ConsumptionPieChart from '../../components/admin/charts/ConsumptionPieChart';
import ConsumptionBarChart from '../../components/admin/charts/ConsumptionBarChart';
import RouteSankeyChart from '../../components/admin/charts/RouteSankeyChart';
import SatisfactionRadarChart from '../../components/admin/charts/SatisfactionRadarChart';
import {
  getMobileTourSummary,
  getRecentMobileEvents,
  type MobileRecentEvent,
  type MobileTourSummary,
} from '../../api/analytics';
import {
  getBehaviorConsumption,
  getBehaviorMarketing,
  getBehaviorOverview,
  getBehaviorRoutePreference,
  getBehaviorSatisfaction,
  getBehaviorUploadStatus,
  uploadBehaviorData,
  type BehaviorOverview,
  type ConsumptionAnalysis,
  type MarketingAnalysis,
  type RoutePreference,
  type SatisfactionAnalysis,
} from '../../api/behavior';

const BehaviorPage: React.FC = () => {
  const [overview, setOverview] = useState<BehaviorOverview | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionAnalysis | null>(null);
  const [routePreference, setRoutePreference] = useState<RoutePreference | null>(null);
  const [satisfaction, setSatisfaction] = useState<SatisfactionAnalysis | null>(null);
  const [marketing, setMarketing] = useState<MarketingAnalysis | null>(null);
  const [mobileSummary, setMobileSummary] = useState<MobileTourSummary | null>(null);
  const [mobileRecent, setMobileRecent] = useState<MobileRecentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [strategy, setStrategy] = useState<'append' | 'overwrite'>('append');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [marketingRes, mobileSummaryRes, mobileRecentRes] = await Promise.all([
        getBehaviorMarketing(),
        getMobileTourSummary(7),
        getRecentMobileEvents(8),
      ]);
      setMarketing(marketingRes);
      if (marketingRes.source?.overview) setOverview(marketingRes.source.overview);
      if (marketingRes.source?.consumption) setConsumption(marketingRes.source.consumption);
      if (marketingRes.source?.routePreference) setRoutePreference(marketingRes.source.routePreference);
      if (marketingRes.source?.satisfaction) setSatisfaction(marketingRes.source.satisfaction);
      setMobileSummary(mobileSummaryRes);
      setMobileRecent(mobileRecentRes);
    } catch (err: any) {
      try {
        const [overviewRes, consumptionRes, routeRes, satisfactionRes, mobileSummaryRes, mobileRecentRes] = await Promise.all([
          getBehaviorOverview(),
          getBehaviorConsumption(),
          getBehaviorRoutePreference(),
          getBehaviorSatisfaction(),
          getMobileTourSummary(7),
          getRecentMobileEvents(8),
        ]);
        setOverview(overviewRes);
        setConsumption(consumptionRes);
        setRoutePreference(routeRes);
        setSatisfaction(satisfactionRes);
        setMobileSummary(mobileSummaryRes);
        setMobileRecent(mobileRecentRes);
      } catch (fallbackErr: any) {
        message.error('加载行为数据失败: ' + (fallbackErr?.message || err?.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadData]);

  const pollUpload = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const status = await getBehaviorUploadStatus(taskId);
      setProgress(status.progress);
      if (status.status === 'done') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setUploading(false);
        message.success(`导入完成：${status.inserted ?? 0} 条`);
        loadData();
      }
      if (status.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setUploading(false);
        message.error(status.error || '导入失败');
      }
    }, 2500);
  }, [loadData]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setProgress(5);
    try {
      const result = await uploadBehaviorData(file, strategy);
      message.success('导入任务已提交');
      pollUpload(result.taskId);
    } catch (err: any) {
      setUploading(false);
      setProgress(0);
      message.error('上传失败: ' + (err?.message || '未知错误'));
    }
  }, [pollUpload, strategy]);

  const suggestions = marketing?.suggestions.map((item, index) => ({
    id: `marketing-${index}`,
    number: index + 1,
    text: item,
    highlight: index < 2,
  })) ?? [];
  const mobileTopSpot = mobileSummary?.topSpots[0] ?? null;
  const mobileTopRoute = mobileSummary?.topRoutes[0] ?? null;
  const mobileTopEvent = mobileSummary?.eventCounts[0] ?? null;
  const mobileEventLabel = mobileTopEvent?.eventName
    ? mobileTopEvent.eventName.replace(/_/g, ' ')
    : '等待事件回流';
  const crossTerminalInsight = mobileSummary?.totalEvents
    ? `移动端近 7 日回流 ${(mobileSummary.totalEvents).toLocaleString()} 条事件，重点关注 ${mobileTopSpot?.spotName || mobileTopRoute?.routeName || mobileEventLabel}；可与 Web 大屏提问热点一起判断游客真实兴趣。`
    : '移动端暂未形成可分析样本，当前洞察以 Web 大屏问答和导入行为数据为主。';

  return (
    <div data-testid="behavior-page" className="animate-scroll-unfold" style={{ padding: 32, maxWidth: 1480, margin: '0 auto' }}>
      <PageTransition>
        <DataVStage
          eyebrow="TOURIST BEHAVIOR ATLAS"
          title="游客行为洞察中枢"
          subtitle="以 14 万条游览行为为底图，叠加消费结构、路线流转、满意度短板和营销建议，让后台不只是报表，而是景区运营判断台。"
          metrics={[
            { label: '行为记录', value: (overview?.visits ?? 0).toLocaleString(), suffix: '条', hint: '样本入库规模', tone: 'vermilion' },
            { label: '游客数', value: (overview?.tourists ?? 0).toLocaleString(), suffix: '人', hint: '去重游客', tone: 'jade' },
            { label: '人均消费', value: (overview?.avgCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 }), suffix: '元', hint: '消费潜力', tone: 'gold' },
            { label: '满意度', value: (overview?.avgSatisfaction ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 }), suffix: '/5', hint: '服务温度', tone: 'ink' },
          ]}
          actions={(
            <>
            <Radio.Group value={strategy} onChange={(e) => setStrategy(e.target.value)} disabled={uploading}>
              <Radio.Button value="append">追加</Radio.Button>
              <Radio.Button value="overwrite">覆盖</Radio.Button>
            </Radio.Group>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '9px 18px', border: '1px solid rgba(247,245,240,0.22)', borderRadius: 999, background: 'linear-gradient(135deg, #C84B31, #D9A45C)', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', gap: 6, alignItems: 'center', boxShadow: '0 10px 24px rgba(200,75,49,0.22)' }}>
              <CloudUploadOutlined /> 上传行为数据
            </button>
            <button onClick={loadData} disabled={loading} style={{ padding: '9px 14px', border: '1px solid rgba(247,245,240,0.22)', borderRadius: 999, background: 'rgba(247,245,240,0.10)', color: '#F7F5F0', cursor: 'pointer' }}>
              <ReloadOutlined />
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </>
          )}
        />

        {uploading && (
          <PaperPanel style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: 'var(--text-secondary)', minWidth: 120 }}>数据入库中</span>
              <Progress percent={progress} strokeColor="#6A9C89" />
            </div>
          </PaperPanel>
        )}

        <PaperPanel title="双端游客行为结论" withScrollHead style={{ marginBottom: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}>
            {[
              {
                icon: <RiseOutlined />,
                label: '线下行为样本',
                value: `${(overview?.visits ?? 0).toLocaleString()} 条`,
                hint: '导入数据中的消费、停留、满意度记录',
              },
              {
                icon: <MobileOutlined />,
                label: '移动端事件',
                value: `${(mobileSummary?.totalEvents ?? 0).toLocaleString()} 条`,
                hint: '近 7 日导览、到达、讲解、反馈回流',
              },
              {
                icon: <FireOutlined />,
                label: '移动端热点',
                value: mobileTopSpot?.spotName || mobileTopRoute?.routeName || '暂无',
                hint: mobileTopEvent ? `${mobileEventLabel} · ${mobileTopEvent.count} 次` : '等待移动端真实使用数据',
              },
              {
                icon: <ReloadOutlined />,
                label: '最近事件',
                value: mobileRecent[0]?.spotName || mobileRecent[0]?.routeName || mobileRecent[0]?.eventName?.replace(/_/g, ' ') || '暂无',
                hint: mobileRecent[0]?.createdAt ? new Date(mobileRecent[0].createdAt).toLocaleString('zh-CN') : '移动端上报后自动更新',
              },
            ].map((item) => (
              <div key={item.label} style={{
                minHeight: 118,
                padding: 16,
                borderRadius: 18,
                border: '1px solid rgba(184, 115, 51, 0.12)',
                background: 'linear-gradient(180deg, rgba(255,253,247,0.82), rgba(255,248,229,0.48))',
                boxShadow: '0 12px 28px rgba(42,37,32,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mountain-mid)', fontSize: 13, fontWeight: 700 }}>
                  {item.icon}
                  {item.label}
                </div>
                <div title={item.value} style={{
                  marginTop: 10,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.value}
                </div>
                <div style={{ marginTop: 7, color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.55 }}>
                  {item.hint}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(106, 156, 137, 0.10)',
            border: '1px solid rgba(106, 156, 137, 0.15)',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}>
            {crossTerminalInsight}
          </div>
        </PaperPanel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <PaperPanel><ConsumptionPieChart data={consumption?.breakdown} /></PaperPanel>
          <PaperPanel><ConsumptionBarChart data={consumption?.monthlyTrend} /></PaperPanel>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, marginBottom: 20 }}>
          <PaperPanel><RouteSankeyChart data={routePreference ?? undefined} /></PaperPanel>
          <PaperPanel><SatisfactionRadarChart data={satisfaction ?? undefined} /></PaperPanel>
        </div>

        <PaperPanel title="营销决策札记" withScrollHead>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
            <SealCard color="vermilion">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vermilion)', marginBottom: 12 }}>
                <RiseOutlined />
                核心客群
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {marketing?.persona.label ?? '样本观察中'}
              </div>
              <div style={{ color: 'var(--text-tertiary)', lineHeight: 1.8, fontSize: 13 }}>
                人均消费 {marketing?.persona.avgCost ?? 0} 元<br />
                停留 {marketing?.persona.avgStayDuration ?? 0} 分钟<br />
                满意度 {marketing?.persona.avgSatisfaction ?? 0}/5
              </div>
            </SealCard>
            <div>
              {suggestions.length > 0 ? (
                <InscriptionList items={suggestions} />
              ) : (
                <div style={{ color: 'var(--text-tertiary)', padding: 24 }}>暂无营销建议，导入行为数据后自动生成。</div>
              )}
            </div>
          </div>
        </PaperPanel>
      </PageTransition>
    </div>
  );
};

export default BehaviorPage;
