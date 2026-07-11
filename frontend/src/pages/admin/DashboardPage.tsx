import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FireOutlined,
  MobileOutlined,
  RiseOutlined,
  SmileOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import AnimatedNumber from '../../components/admin/AnimatedNumber';
import PageTransition from '../../components/admin/PageTransition';
import ScenicMapStage, { type MapLayer } from '../../components/admin/ScenicMapStage';
import {
  getHeatmap,
  getMobileTourSummary,
  getOverview,
  getTopQuestions,
  getTrends,
  type HeatmapItem,
  type MobileTourSummary,
  type OverviewMetrics,
  type TopQuestionItem,
  type TrendsItem,
} from '../../api/analytics';
import {
  getBehaviorConsumption,
  getBehaviorMarketing,
  getBehaviorOverview,
  getBehaviorRoutePreference,
  getBehaviorSatisfaction,
  type BehaviorOverview,
  type ConsumptionAnalysis,
  type MarketingAnalysis,
  type RoutePreference,
  type SatisfactionAnalysis,
} from '../../api/behavior';
import { listSpots, type Spot } from '../../api/spots';

const layerButtons: Array<{ key: MapLayer; label: string; icon: React.ReactNode }> = [
  { key: 'traffic', label: '游客热度', icon: <TeamOutlined /> },
  { key: 'questions', label: '问答热度', icon: <FireOutlined /> },
  { key: 'satisfaction', label: '满意度风险', icon: <AlertOutlined /> },
  { key: 'route', label: '路线流向', icon: <EnvironmentOutlined /> },
  { key: 'consumption', label: '消费偏好', icon: <RiseOutlined /> },
];

function fulfilledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

const formatNumber = (value?: number | null, fractionDigits = 0) =>
  (value ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: fractionDigits });

const formatPercent = (value?: number | null, fractionDigits = 0) =>
  `${((value ?? 0) * 100).toLocaleString('zh-CN', { maximumFractionDigits: fractionDigits })}%`;

const getPeakHourLabel = (heatmapData: HeatmapItem[]) => {
  if (heatmapData.length === 0) return '等待数据';
  const peak = heatmapData.reduce((current, item) => (item.count > current.count ? item : current), heatmapData[0]);
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${dayNames[peak.day_of_week] ?? '本周'} ${String(peak.hour).padStart(2, '0')}:00`;
};

const getTrendPoints = (trends: TrendsItem[]) => {
  const values = trends.map((item) => item.interactions);
  const max = Math.max(...values, 1);
  return trends.map((item, index) => {
    const x = trends.length <= 1 ? 50 : (index / (trends.length - 1)) * 100;
    const y = 88 - (item.interactions / max) * 70;
    return `${x},${y}`;
  }).join(' ');
};

interface BrainPanelProps {
  title: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
}

const BrainPanel: React.FC<BrainPanelProps> = ({ title, eyebrow, icon, children, compact = false }) => (
  <section className={`brain-panel${compact ? ' brain-panel--compact' : ''}`}>
    <span className="brain-panel__scan" aria-hidden="true" />
    <span className="brain-panel__edge brain-panel__edge--top" aria-hidden="true" />
    <span className="brain-panel__edge brain-panel__edge--bottom" aria-hidden="true" />
    <div className="brain-panel__head">
      <div>
        {eyebrow && <span className="brain-panel__eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
      </div>
      {icon && <span className="brain-panel__icon">{icon}</span>}
    </div>
    {children}
  </section>
);

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  hint: string;
  tone?: 'red' | 'jade' | 'gold' | 'ink';
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, suffix, hint, tone = 'jade' }) => (
  <div className={`metric-tile metric-tile--${tone}`}>
    <span className="metric-tile__label">{label}</span>
    <strong>
      {value}
      {suffix && <em>{suffix}</em>}
    </strong>
    <small>{hint}</small>
  </div>
);

interface RankingBarProps {
  label: string;
  value: number;
  max: number;
  index: number;
  suffix?: string;
}

const RankingBar: React.FC<RankingBarProps> = ({ label, value, max, index, suffix = '次' }) => (
  <div className="ranking-bar">
    <div className="ranking-bar__row">
      <span className={index < 3 ? 'ranking-bar__rank ranking-bar__rank--hot' : 'ranking-bar__rank'}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="ranking-bar__label" title={label}>{label}</span>
      <strong>{formatNumber(value)}{suffix}</strong>
    </div>
    <div className="ranking-bar__track">
      <span style={{ width: `${Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100))}%` }} />
    </div>
  </div>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <div className="empty-hint">{text}</div>
);

const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [trends, setTrends] = useState<TrendsItem[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [behaviorOverview, setBehaviorOverview] = useState<BehaviorOverview | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionAnalysis | null>(null);
  const [routePreference, setRoutePreference] = useState<RoutePreference | null>(null);
  const [satisfaction, setSatisfaction] = useState<SatisfactionAnalysis | null>(null);
  const [marketing, setMarketing] = useState<MarketingAnalysis | null>(null);
  const [mobileSummary, setMobileSummary] = useState<MobileTourSummary | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('traffic');

  const loadData = useCallback(async () => {
    const primaryResults = await Promise.allSettled([
      getOverview(),
      getTopQuestions(8),
      getHeatmap(),
      getTrends(7),
      listSpots(),
      getMobileTourSummary(7),
    ]);

    const overviewRes = fulfilledValue(primaryResults[0]);
    const questionsRes = fulfilledValue(primaryResults[1]);
    const heatmapRes = fulfilledValue(primaryResults[2]);
    const trendsRes = fulfilledValue(primaryResults[3]);
    const spotsRes = fulfilledValue(primaryResults[4]);
    const mobileSummaryRes = fulfilledValue(primaryResults[5]);

    if (overviewRes) setOverview(overviewRes);
    if (questionsRes) setTopQuestions(questionsRes);
    if (heatmapRes) setHeatmapData(heatmapRes);
    if (trendsRes) setTrends(trendsRes);
    if (spotsRes) setSpots(spotsRes);
    if (mobileSummaryRes) setMobileSummary(mobileSummaryRes);

    const failedCount = primaryResults.filter((item) => item.status === 'rejected').length;
    if (failedCount > 0) {
      message.warning(`有 ${failedCount} 组运营数据暂未加载，页面已展示可用数据`);
    }

    getBehaviorMarketing()
      .then((marketingRes) => {
        setMarketing(marketingRes);
        if (marketingRes.source?.consumption) setConsumption(marketingRes.source.consumption);
        if (marketingRes.source?.overview) setBehaviorOverview(marketingRes.source.overview);
        if (marketingRes.source?.routePreference) setRoutePreference(marketingRes.source.routePreference);
        if (marketingRes.source?.satisfaction) setSatisfaction(marketingRes.source.satisfaction);
      })
      .catch(() => {
        Promise.allSettled([
          getBehaviorOverview(),
          getBehaviorRoutePreference(),
          getBehaviorSatisfaction(),
          getBehaviorConsumption(),
        ])
          .then(([overviewResult, routeResult, satisfactionResult, consumptionResult]) => {
            const overviewFallback = fulfilledValue(overviewResult);
            const routeFallback = fulfilledValue(routeResult);
            const satisfactionFallback = fulfilledValue(satisfactionResult);
            const consumptionFallback = fulfilledValue(consumptionResult);
            if (overviewFallback) setBehaviorOverview(overviewFallback);
            if (routeFallback) setRoutePreference(routeFallback);
            if (satisfactionFallback) setSatisfaction(satisfactionFallback);
            if (consumptionFallback) setConsumption(consumptionFallback);
          })
          .catch(() => undefined);
      })
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      getOverview()
        .then((data) => {
          setOverview(data);
        })
        .catch(() => undefined);
      getMobileTourSummary(7)
        .then((data) => {
          setMobileSummary(data);
        })
        .catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const weeklyInteractions = useMemo(
    () => trends.reduce((total, item) => total + item.interactions, 0),
    [trends],
  );

  const filteredQuestions = useMemo(
    () => topQuestions.filter((item) => item.question.replace(/\?/g, '').trim().length > 0),
    [topQuestions],
  );

  const topQuestionMax = Math.max(...filteredQuestions.map((item) => item.count), 1);
  const topSpotMax = Math.max(...(routePreference?.topSpots ?? []).map((item) => item.visits), 1);
  const riskSpots = marketing?.riskSpots?.length
    ? marketing.riskSpots
    : [...(satisfaction?.byAttraction ?? [])]
      .sort((a, b) => a.avgSatisfaction - b.avgSatisfaction)
      .slice(0, 4);
  const consumptionTop = [...(consumption?.breakdown ?? [])].sort((a, b) => b.value - a.value).slice(0, 4);
  const actionSuggestions = marketing?.suggestions?.length
    ? marketing.suggestions.slice(0, 1)
    : consumptionTop.slice(0, 1).map((item) =>
      `${item.name} 占比 ${formatPercent(item.ratio)}，可结合热区布置引导牌与数字人讲解词。`,
    );
  const avgSatisfaction = behaviorOverview?.avgSatisfaction ?? (
    satisfaction?.byAttraction.length
      ? satisfaction.byAttraction.reduce((total, item) => total + item.avgSatisfaction, 0) / satisfaction.byAttraction.length
      : 0
  );
  const sentiment = overview?.avgSentimentScore ?? 0;
  const hottestSpot = routePreference?.topSpots?.[0] ?? null;
  const topQuestion = filteredQuestions[0] ?? null;
  const primaryRisk = riskSpots[0] ?? null;
  const responseSeconds = (overview?.avgLatencyMs ?? 0) / 1000;
  const faqHitPercent = (overview?.faqHitRate ?? 0) * 100;
  const decisionAdvice = actionSuggestions[0]
    ?? (primaryRisk
      ? `${primaryRisk.name} 满意度偏低，建议补充排队、路线与服务说明。`
      : '当前服务态势平稳，建议继续观察游客问答热点并维护知识库。');
  const strongestRoute = routePreference?.links?.length
    ? routePreference.links.reduce((current, item) => (item.value > current.value ? item : current), routePreference.links[0])
    : null;
  const topConsumption = consumptionTop[0] ?? null;
  const mobileEventCount = mobileSummary?.totalEvents ?? 0;
  const mobileTopSpot = mobileSummary?.topSpots[0] ?? null;
  const mobileTopRoute = mobileSummary?.topRoutes[0] ?? null;
  const mobileQuestionCount = mobileSummary?.eventCounts.find((item) => item.eventName === 'question_asked')?.count ?? 0;
  const dualTerminalAdvice = mobileEventCount > 0
    ? `移动端近 7 日回流 ${formatNumber(mobileEventCount)} 条事件，${mobileTopSpot?.spotName || mobileTopRoute?.routeName || '核心景点'} 是当前重点运营对象。`
    : '移动端暂未形成稳定回流，先确认 8000/api 代理和导览埋点上报，再做跨端趋势判断。';
  const layerMetrics: Record<MapLayer, { value: string; unit: string; hint: string }> = {
    traffic: {
      value: formatNumber(overview?.todayInteractions ?? behaviorOverview?.visits ?? 0),
      unit: '人次',
      hint: hottestSpot?.name ?? '客流热区',
    },
    questions: {
      value: formatNumber(topQuestion?.count ?? 0),
      unit: '次',
      hint: topQuestion ? '高频咨询' : '问答热区',
    },
    satisfaction: {
      value: formatNumber(avgSatisfaction, 1),
      unit: '/5',
      hint: primaryRisk?.name ?? '满意度态势',
    },
    route: {
      value: formatNumber(strongestRoute?.value ?? routePreference?.topSpots?.[0]?.visits ?? 0),
      unit: '流量',
      hint: strongestRoute ? `${strongestRoute.source}→${strongestRoute.target}` : '路线动线',
    },
    consumption: {
      value: topConsumption ? formatPercent(topConsumption.ratio) : '0%',
      unit: '',
      hint: topConsumption?.name ?? '消费偏好',
    },
  };

  return (
    <div data-testid="dashboard-page" className="smart-brain-shell">
      <PageTransition>
        <div className="smart-brain-shell__mist smart-brain-shell__mist--left" />
        <div className="smart-brain-shell__mist smart-brain-shell__mist--right" />

        <section className="operations-ribbon" aria-label="景区 AI 导览运营态势">
          <div className="operations-ribbon__lead">
            <span>今日 AI 服务人次</span>
            <strong>
              <AnimatedNumber value={overview?.todayInteractions ?? 0} />
              <em>人次</em>
            </strong>
            <small>当前活跃 {formatNumber(overview?.uniqueSessions)} 组会话</small>
          </div>
          <div className="operations-ribbon__metrics">
            <div className="operation-kpi">
              <span>游客满意度</span>
              <strong>{formatNumber(avgSatisfaction, 1)}<em>/5</em></strong>
              <small>情绪均值 {formatNumber(sentiment, 2)}</small>
            </div>
            <div className="operation-kpi">
              <span>平均响应</span>
              <strong>{formatNumber(responseSeconds, 1)}<em>s</em></strong>
              <small>{responseSeconds > 5 ? '需优化响应链路' : '低于赛题 5 秒要求'}</small>
            </div>
            <div className="operation-kpi">
              <span>知识命中率</span>
              <strong>{formatNumber(faqHitPercent)}<em>%</em></strong>
              <small>FAQ / 知识库召回</small>
            </div>
            <div className="operation-kpi operation-kpi--alert">
              <span>待关注风险</span>
              <strong>{riskSpots.length}<em>处</em></strong>
              <small>{primaryRisk?.name ?? '暂无低分景点'}</small>
            </div>
          </div>
          <div className="operations-ribbon__advice">
            <span>AI 运营建议</span>
            <p>{decisionAdvice}</p>
          </div>
        </section>

        <section className="dual-signal-strip" aria-label="Web 大屏与移动端双端态势">
          <article>
            <span>Web 大屏今日互动</span>
            <strong>{formatNumber(overview?.todayInteractions)}<em>次</em></strong>
            <small>来自互动大屏问答与讲解服务</small>
          </article>
          <article>
            <span>移动端近 7 日事件</span>
            <strong>{formatNumber(mobileEventCount)}<em>条</em></strong>
            <small>导览、到达、讲解、反馈行为回流</small>
          </article>
          <article>
            <span>移动端热点</span>
            <strong title={mobileTopSpot?.spotName || mobileTopRoute?.routeName || undefined}>
              {mobileTopSpot?.spotName || mobileTopRoute?.routeName || '等待回流'}
            </strong>
            <small>{mobileQuestionCount > 0 ? `移动端提问 ${formatNumber(mobileQuestionCount)} 次` : '路线与景点事件会在这里沉淀'}</small>
          </article>
          <article className="dual-signal-strip__advice">
            <span>运营判断</span>
            <p>{dualTerminalAdvice}</p>
          </article>
        </section>

        <main className="smart-brain-grid">
          <aside className="brain-column">
            <BrainPanel title="服务态势" eyebrow="SERVICE TODAY" icon={<ThunderboltOutlined />}>
              <div className="metric-grid">
                <MetricTile
                  label="今日服务人次"
                  value={<AnimatedNumber value={overview?.todayInteractions ?? 0} />}
                  suffix="人次"
                  hint="游客端 AI 导览交互"
                  tone="red"
                />
                <MetricTile
                  label="本周服务人次"
                  value={<AnimatedNumber value={weeklyInteractions} />}
                  suffix="人次"
                  hint="近 7 日趋势汇总"
                  tone="gold"
                />
                <MetricTile
                  label="活跃会话"
                  value={<AnimatedNumber value={overview?.uniqueSessions ?? 0} />}
                  suffix="组"
                  hint="正在或近期访问"
                  tone="jade"
                />
                <MetricTile
                  label="语音输入占比"
                  value={<AnimatedNumber value={(overview?.voiceRatio ?? 0) * 100} />}
                  suffix="%"
                  hint="多模态入口占比"
                  tone="ink"
                />
              </div>
            </BrainPanel>

            <BrainPanel title="热门问答" eyebrow="QUESTION HEAT" icon={<FireOutlined />}>
              {filteredQuestions.length > 0 ? (
                <div className="ranking-list">
                  {filteredQuestions.slice(0, 4).map((item, index) => (
                    <RankingBar
                      key={`${item.question}-${index}`}
                      label={item.question}
                      value={item.count}
                      max={topQuestionMax}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <EmptyHint text="暂无问答热点，等待游客交互数据入库" />
              )}
            </BrainPanel>

            <BrainPanel title="时段承载" eyebrow="TRAFFIC RHYTHM" icon={<ClockCircleOutlined />} compact>
              <div className="pulse-card">
                <span>峰值时段</span>
                <strong>{getPeakHourLabel(heatmapData)}</strong>
                <small>平均响应 {formatNumber(overview?.avgLatencyMs, 0)} ms · FAQ 命中 {formatPercent(overview?.faqHitRate)}</small>
              </div>
              <svg className="trend-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={getTrendPoints(trends)} />
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F05A28" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#F05A28" stopOpacity="0" />
                </linearGradient>
              </svg>
            </BrainPanel>
          </aside>

          <section className="brain-map-zone brain-map-zone--embedded">
            <ScenicMapStage
              spots={spots}
              routePreference={routePreference}
              satisfaction={satisfaction}
              consumption={consumption}
              topQuestions={filteredQuestions}
              activeLayer={activeLayer}
              height="100%"
              minHeight={0}
              showHeader={false}
              showLegend={false}
              visualMode="embedded"
            />
            <div className="map-insight map-insight--hot">
              <span>当前主热区</span>
              <strong>{hottestSpot?.name ?? '热区识别中'}</strong>
              <small>{hottestSpot ? `${formatNumber(hottestSpot.visits)} 人次访问 / 路线聚集` : '等待路线与访问数据入库'}</small>
            </div>
            <div className="map-insight map-insight--question">
              <span>游客正在问</span>
              <strong title={topQuestion?.question}>{topQuestion?.question ?? '等待问答数据'}</strong>
              <small>{topQuestion ? `${formatNumber(topQuestion.count)} 次提问，建议同步知识库话术` : '暂无高频问题'}</small>
            </div>
            <div className="map-insight map-insight--risk">
              <span>服务风险点</span>
              <strong>{primaryRisk?.name ?? '暂无风险点'}</strong>
              <small>{primaryRisk ? `满意度 ${formatNumber(primaryRisk.avgSatisfaction, 1)}，建议运营巡检` : '当前满意度风险平稳'}</small>
            </div>
            <div className="layer-dock" aria-label="沙盘图层切换">
              {layerButtons.map((item) => {
                const metric = layerMetrics[item.key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={[
                      'layer-dock__button',
                      `layer-dock__button--${item.key}`,
                      activeLayer === item.key ? 'layer-dock__button--active' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setActiveLayer(item.key)}
                  >
                    <span className="layer-dock__icon">{item.icon}</span>
                    <span className="layer-dock__copy">
                      <b>{item.label}</b>
                      <small title={metric.hint}>{metric.value}<em>{metric.unit}</em></small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="brain-column">
            <BrainPanel title="游客感受度" eyebrow="SENTIMENT" icon={<SmileOutlined />}>
              <div className="sentiment-orb">
                <div className="sentiment-orb__ring">
                  <strong>{formatNumber(avgSatisfaction, 1)}</strong>
                  <span>/ 5</span>
                </div>
                <div>
                  <b>情感均值 {formatNumber(sentiment, 2)}</b>
                  <small>结合游客交互情绪与行为满意度，识别服务温度变化。</small>
                </div>
              </div>
              <div className="sentiment-bars">
                {(trends.length ? trends : [{ positiveRatio: 0, neutralRatio: 0, negativeRatio: 0 } as TrendsItem]).slice(-1).map((item, index) => (
                  <React.Fragment key={index}>
                    <span style={{ width: `${Math.max(2, item.positiveRatio * 100)}%` }} />
                    <span style={{ width: `${Math.max(2, item.neutralRatio * 100)}%` }} />
                    <span style={{ width: `${Math.max(2, item.negativeRatio * 100)}%` }} />
                  </React.Fragment>
                ))}
              </div>
            </BrainPanel>

            <BrainPanel title="路线热区" eyebrow="ROUTE FLOW" icon={<EnvironmentOutlined />}>
              {routePreference?.topSpots?.length ? (
                <div className="ranking-list">
                  {routePreference.topSpots.slice(0, 4).map((item, index) => (
                    <RankingBar
                      key={`${item.name}-${index}`}
                      label={item.name}
                      value={item.visits}
                      max={topSpotMax}
                      index={index}
                      suffix="人"
                    />
                  ))}
                </div>
              ) : (
                <EmptyHint text="暂无路线偏好数据，导入游客行为记录后生成" />
              )}
            </BrainPanel>

            <BrainPanel title="风险与建议" eyebrow="SERVICE RISK" icon={<AlertOutlined />} compact>
              {riskSpots.length > 0 ? (
                <div className="risk-list">
                  {riskSpots.slice(0, 3).map((item, index) => (
                    <div className="risk-item" key={`${item.name}-${index}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{formatNumber(item.visits)} 次反馈</span>
                      </div>
                      <b>{formatNumber(item.avgSatisfaction, 1)}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint text="暂无低分风险点" />
              )}
              {actionSuggestions.length > 0 && (
                <div className="suggestion-scroll">
                  {actionSuggestions.map((item, index) => (
                    <div className="suggestion-item" key={`${item}-${index}`}>
                      <span>{index + 1}</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              )}
            </BrainPanel>
          </aside>
        </main>
      </PageTransition>

      <style>
        {`
          .smart-brain-shell {
            position: relative;
            min-height: calc(100vh - 64px);
            padding: 0 24px 32px;
            overflow: visible;
            background:
              radial-gradient(circle at 50% 48%, rgba(255, 241, 197, 0.42), transparent 34%),
              linear-gradient(180deg, rgba(253, 248, 236, 0.94), rgba(246, 237, 215, 0.88));
          }

          .smart-brain-shell::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(rgba(200, 75, 49, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201, 169, 110, 0.10) 1px, transparent 1px);
            background-size: 60px 60px;
            mask-image: radial-gradient(circle at 50% 48%, rgba(0,0,0,0.78), transparent 76%);
          }

          .smart-brain-shell__mist {
            position: absolute;
            width: 360px;
            height: 360px;
            border-radius: 50%;
            opacity: 0.12;
            pointer-events: none;
          }

          .smart-brain-shell__mist--left {
            left: -120px;
            top: 20%;
            background: #6A9C89;
          }

          .smart-brain-shell__mist--right {
            right: -130px;
            bottom: 8%;
            background: #F05A28;
          }

          .operations-ribbon {
            position: relative;
            z-index: 3;
            display: grid;
            grid-template-columns: minmax(160px, 0.64fr) minmax(500px, 1.9fr) minmax(250px, 0.9fr);
            gap: 8px;
            align-items: stretch;
            margin: 0 0 8px;
            padding: 6px 8px;
            border-top: 1px solid rgba(240, 90, 40, 0.18);
            border-bottom: 1px solid rgba(201, 169, 110, 0.16);
            background:
              linear-gradient(90deg, rgba(240, 90, 40, 0.055), rgba(255, 253, 247, 0.26) 30%, rgba(106, 156, 137, 0.052) 72%, transparent),
              rgba(255, 253, 247, 0.12);
          }

          .operations-ribbon::before,
          .operations-ribbon::after {
            content: '';
            position: absolute;
            top: -1px;
            width: 72px;
            height: 1px;
            background: #F05A28;
            pointer-events: none;
          }

          .operations-ribbon::before {
            left: 0;
          }

          .operations-ribbon::after {
            right: 0;
          }

          .operations-ribbon__lead,
          .operations-ribbon__advice,
          .operation-kpi {
            position: relative;
            overflow: hidden;
            min-width: 0;
          }

          .operations-ribbon__lead {
            padding: 0 0 0 10px;
            border-left: 2px solid rgba(240, 90, 40, 0.58);
          }

          .operations-ribbon__lead span,
          .operations-ribbon__advice span,
          .operation-kpi span {
            display: block;
            color: rgba(42, 37, 32, 0.46);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.16em;
          }

          .operations-ribbon__lead strong {
            display: flex;
            align-items: baseline;
            gap: 5px;
            margin-top: 2px;
            color: #C84B31;
            font-family: var(--font-serif);
            font-size: 25px;
            line-height: 1;
          }

          .operations-ribbon em {
            color: rgba(42, 37, 32, 0.44);
            font-family: var(--font-family);
            font-size: 11px;
            font-style: normal;
          }

          .operations-ribbon small {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            color: rgba(42, 37, 32, 0.44);
            font-size: 10px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .operations-ribbon__metrics {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 5px;
            min-width: 0;
          }

          .operation-kpi {
            padding: 1px 7px 1px 9px;
            border-left: 1px solid rgba(201, 169, 110, 0.22);
            background: linear-gradient(90deg, rgba(255, 253, 247, 0.36), transparent);
          }

          .operation-kpi strong {
            display: flex;
            align-items: baseline;
            gap: 3px;
            margin-top: 3px;
            color: #2A2520;
            font-family: var(--font-serif);
            font-size: 20px;
            line-height: 1;
          }

          .operation-kpi--alert strong {
            color: #C84B31;
          }

          .operations-ribbon__advice {
            display: grid;
            align-content: center;
            padding: 3px 10px;
            border-left: 1px solid rgba(240, 90, 40, 0.20);
            background:
              linear-gradient(90deg, rgba(240, 90, 40, 0.08), rgba(255, 253, 247, 0.28), transparent);
          }

          .operations-ribbon__advice p {
            margin: 3px 0 0;
            color: rgba(42, 37, 32, 0.72);
            font-size: 11px;
            line-height: 1.35;
          }

          .dual-signal-strip {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 0.9fr 0.9fr 1fr 1.65fr;
            gap: 10px;
            margin: 10px 0 12px;
          }

          .dual-signal-strip article {
            min-height: 66px;
            padding: 10px 14px;
            overflow: hidden;
            border: 1px solid rgba(184, 115, 51, 0.13);
            border-radius: 18px;
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.84), rgba(255, 248, 229, 0.56)),
              var(--texture-paper);
            box-shadow: 0 12px 28px rgba(42, 37, 32, 0.05);
          }

          .dual-signal-strip span,
          .dual-signal-strip small {
            display: block;
            color: rgba(42, 37, 32, 0.50);
            font-size: 11px;
            line-height: 1.35;
          }

          .dual-signal-strip strong {
            display: block;
            max-width: 100%;
            margin: 4px 0 2px;
            overflow: hidden;
            color: #241F1A;
            font-family: var(--font-serif);
            font-size: 21px;
            line-height: 1.1;
            letter-spacing: 0.04em;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dual-signal-strip em {
            margin-left: 3px;
            color: rgba(36, 31, 26, 0.48);
            font-family: var(--font-sans);
            font-size: 11px;
            font-style: normal;
          }

          .dual-signal-strip__advice {
            border-color: rgba(106, 156, 137, 0.18) !important;
            background:
              linear-gradient(135deg, rgba(106, 156, 137, 0.13), rgba(255, 253, 247, 0.74)),
              var(--texture-paper) !important;
          }

          .dual-signal-strip__advice p {
            margin: 4px 0 0;
            color: rgba(42, 37, 32, 0.70);
            font-size: 12px;
            line-height: 1.55;
          }

          .smart-brain-grid {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: minmax(238px, 282px) minmax(780px, 1.72fr) minmax(238px, 282px);
            gap: 12px;
            height: auto;
            min-height: max(640px, calc(100vh - 238px));
            overflow: visible;
            align-items: stretch;
          }

          .brain-column {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
            min-height: 0;
            overflow: visible;
            padding: 3px 2px;
            overscroll-behavior: contain;
          }

          .brain-column::before {
            content: '';
            position: absolute;
            inset: 4px 2px;
            z-index: 0;
            pointer-events: none;
            border-left: 1px solid rgba(240, 90, 40, 0.08);
            border-right: 1px solid rgba(201, 169, 110, 0.07);
            background:
              linear-gradient(180deg, rgba(240, 90, 40, 0.045), transparent 18%, transparent 82%, rgba(201, 169, 110, 0.05));
          }

          .brain-column::-webkit-scrollbar {
            width: 4px;
          }

          .brain-column::-webkit-scrollbar-track {
            background: transparent;
          }

          .brain-column::-webkit-scrollbar-thumb {
            background: rgba(201, 169, 110, 0.34);
            border-radius: 999px;
          }

          .brain-map-zone {
            position: relative;
            min-width: 0;
            min-height: 640px;
            height: 100%;
            overflow: visible;
          }

          .brain-map-zone--embedded::before {
            content: '';
            position: absolute;
            inset: -5% -4% -2%;
            z-index: 0;
            pointer-events: none;
            background:
              radial-gradient(ellipse at 50% 50%, rgba(77, 244, 255, 0.13), transparent 46%),
              radial-gradient(ellipse at 50% 62%, rgba(240, 90, 40, 0.08), transparent 36%),
              radial-gradient(ellipse at 50% 58%, rgba(255, 253, 247, 0.36), transparent 68%);
            filter: blur(0.2px);
          }

          .brain-map-zone--embedded::after {
            content: '';
            display: none;
            position: absolute;
            left: 50%;
            bottom: 9%;
            z-index: 1;
            width: min(760px, 92%);
            height: 43%;
            pointer-events: none;
            transform: translateX(-50%) perspective(760px) rotateX(64deg);
            transform-origin: center bottom;
            border-radius: 50%;
            border: 1px solid rgba(18, 126, 152, 0.13);
            background:
              repeating-radial-gradient(ellipse at center, rgba(18, 126, 152, 0.16) 0 1px, transparent 1px 34px),
              linear-gradient(90deg, transparent 49.8%, rgba(18, 126, 152, 0.18) 50%, transparent 50.2%),
              linear-gradient(0deg, transparent 49.8%, rgba(18, 126, 152, 0.14) 50%, transparent 50.2%);
            opacity: 0.52;
            mask-image: radial-gradient(ellipse, rgba(0,0,0,0.78), transparent 72%);
          }

          .brain-map-zone--embedded > .scenic-map-stage {
            position: relative;
            z-index: 2;
          }

          .map-insight {
            position: absolute;
            z-index: 18;
            display: grid;
            gap: 4px;
            max-width: 236px;
            padding: 8px 11px 9px 13px;
            pointer-events: none;
            background:
              linear-gradient(90deg, rgba(255, 253, 247, 0.68), rgba(255, 248, 229, 0.28), transparent);
            border-left: 2px solid var(--insight-color);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(201, 169, 110, 0.12);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }

          .map-insight::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            width: 28px;
            height: 1px;
            background: var(--insight-color);
          }

          .map-insight::after {
            content: '';
            position: absolute;
            left: 8px;
            top: 50%;
            width: 54px;
            height: 1px;
            opacity: 0.32;
            background: var(--insight-color);
            transform: translateX(-100%);
          }

          .map-insight span {
            color: rgba(42, 37, 32, 0.46);
            font-family: var(--font-mono);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.22em;
          }

          .map-insight strong {
            overflow: hidden;
            color: #2A2520;
            font-family: var(--font-serif);
            font-size: 17px;
            line-height: 1.12;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .map-insight small {
            overflow: hidden;
            color: rgba(42, 37, 32, 0.52);
            font-size: 11px;
            line-height: 1.35;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .map-insight--hot {
            --insight-color: #F05A28;
            left: 6%;
            top: 9%;
          }

          .map-insight--question {
            --insight-color: #6A9C89;
            left: 3%;
            top: 47%;
            max-width: 270px;
          }

          .map-insight--risk {
            --insight-color: #D39A22;
            right: 4%;
            top: 12%;
            border-left: 0;
            border-right: 2px solid var(--insight-color);
            background:
              linear-gradient(270deg, rgba(255, 253, 247, 0.68), rgba(255, 248, 229, 0.28), transparent);
            text-align: right;
          }

          .map-insight--risk::before {
            left: auto;
            right: 0;
          }

          .map-insight--risk::after {
            left: auto;
            right: 8px;
            transform: translateX(100%);
          }

          .brain-panel {
            position: relative;
            z-index: 1;
            flex: 0 0 auto;
            overflow: hidden;
            padding: 10px 8px 10px 12px;
            border: 0;
            border-radius: 0;
            background:
              linear-gradient(90deg, rgba(240, 90, 40, 0.055), rgba(255, 253, 247, 0.22) 20%, rgba(255, 253, 247, 0.06) 64%, transparent),
              linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(250, 237, 208, 0.035));
            box-shadow:
              inset 1px 0 0 rgba(240, 90, 40, 0.22),
              inset 0 1px 0 rgba(226, 168, 88, 0.10),
              inset 0 -1px 0 rgba(226, 168, 88, 0.08);
          }

          .smart-brain-grid > .brain-column:first-child .brain-panel:first-child,
          .smart-brain-grid > .brain-column:last-child .brain-panel:first-child {
            display: block;
          }

          .smart-brain-grid > .brain-column:first-child .brain-panel:first-child,
          .smart-brain-grid > .brain-column:last-child .brain-panel:first-child {
            padding-top: 9px;
            padding-bottom: 9px;
          }

          .brain-panel::before,
          .brain-panel::after {
            content: '';
            position: absolute;
            z-index: 2;
            width: 22px;
            height: 22px;
            pointer-events: none;
          }

          .brain-panel::before {
            left: 0;
            top: 0;
            border-left: 2px solid rgba(240, 90, 40, 0.58);
            border-top: 1px solid rgba(240, 90, 40, 0.42);
          }

          .brain-panel::after {
            right: 0;
            bottom: 0;
            border-right: 1px solid rgba(240, 90, 40, 0.30);
            border-bottom: 1px solid rgba(240, 90, 40, 0.34);
          }

          .brain-panel__scan {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background:
              linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
            opacity: 0.24;
            transform: translateX(-120%);
            animation: panelScan 9s ease-in-out infinite;
          }

          .brain-panel__edge {
            position: absolute;
            left: 38px;
            right: 38px;
            z-index: 1;
            height: 1px;
            pointer-events: none;
            background: linear-gradient(90deg, transparent, rgba(240, 90, 40, 0.30), rgba(246, 198, 91, 0.18), transparent);
          }

          .brain-panel__edge--top {
            top: 0;
          }

          .brain-panel__edge--bottom {
            bottom: 0;
          }

          .brain-panel--compact {
            padding-bottom: 10px;
          }

          .brain-panel__head {
            position: relative;
            z-index: 3;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 8px;
          }

          .brain-panel__eyebrow {
            display: block;
            margin-bottom: 4px;
            color: rgba(200, 75, 49, 0.58);
            font-size: 9px;
            letter-spacing: 0.36em;
            font-weight: 900;
          }

          .brain-panel h3 {
            margin: 0;
            font-family: var(--font-serif);
            color: #2A2520;
            font-size: 16px;
            line-height: 1;
            letter-spacing: 0.08em;
          }

          .brain-panel__icon {
            display: grid;
            place-items: center;
            width: 28px;
            height: 28px;
            flex: 0 0 28px;
            border-radius: 999px;
            color: #F05A28;
            font-size: 14px;
            background:
              radial-gradient(circle at 50% 50%, rgba(240, 90, 40, 0.12), transparent 58%),
              rgba(255, 248, 229, 0.34);
            border: 1px solid rgba(240, 90, 40, 0.22);
            box-shadow: 0 0 0 5px rgba(240, 90, 40, 0.045);
          }

          .brain-panel__icon :where(svg),
          .layer-dock__icon :where(svg) {
            width: 1em;
            height: 1em;
            display: block;
          }

          .brain-panel > *:not(.brain-panel__scan):not(.brain-panel__edge) {
            position: relative;
            z-index: 2;
          }

          .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0 12px;
          }

          .metric-tile {
            position: relative;
            min-height: 68px;
            padding: 7px 4px 8px 13px;
            overflow: hidden;
            border-radius: 0;
            background: transparent;
            border: 0;
          }

          .metric-tile::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, var(--tile-color), transparent);
            opacity: 0.58;
          }

          .metric-tile::after {
            content: '';
            position: absolute;
            left: 13px;
            right: 0;
            bottom: 0;
            height: 1px;
            opacity: 0.28;
            background: linear-gradient(90deg, var(--tile-color), transparent);
          }

          .metric-tile__label {
            display: block;
            color: rgba(42, 37, 32, 0.46);
            font-size: 11px;
            letter-spacing: 0.03em;
          }

          .metric-tile strong {
            display: flex;
            align-items: baseline;
            gap: 4px;
            margin-top: 5px;
            font-family: var(--font-serif);
            font-size: 24px;
            line-height: 1;
            color: var(--tile-color);
            text-shadow: 0 8px 18px rgba(240, 90, 40, 0.06);
          }

          .metric-tile strong em {
            color: rgba(42, 37, 32, 0.42);
            font-size: 11px;
            font-style: normal;
            font-family: var(--font-family);
          }

          .metric-tile small {
            display: block;
            margin-top: 4px;
            color: rgba(42, 37, 32, 0.36);
            font-size: 10px;
          }

          .metric-tile--red { --tile-color: #C84B31; }
          .metric-tile--jade { --tile-color: #4A7A68; }
          .metric-tile--gold { --tile-color: #B87333; }
          .metric-tile--ink { --tile-color: #2A2520; }

          .ranking-list {
            display: grid;
            gap: 6px;
          }

          .ranking-bar__row {
            display: grid;
            grid-template-columns: 32px minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
            font-size: 12px;
          }

          .ranking-bar__rank {
            height: 20px;
            display: inline-grid;
            place-items: center;
            border-radius: 0;
            color: rgba(42, 37, 32, 0.34);
            font-family: var(--font-mono);
            font-weight: 700;
          }

          .ranking-bar__rank--hot {
            color: #C84B31;
            background: linear-gradient(90deg, rgba(240, 90, 40, 0.13), transparent);
          }

          .ranking-bar__label {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: rgba(42, 37, 32, 0.70);
          }

          .ranking-bar__row strong {
            color: #6B4A1E;
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0.02em;
          }

          .ranking-bar__track {
            height: 5px;
            margin: 4px 0 0 40px;
            border-radius: 999px;
            background:
              linear-gradient(90deg, rgba(201, 169, 110, 0.10), rgba(201, 169, 110, 0.035)),
              repeating-linear-gradient(90deg, transparent 0 15px, rgba(42, 37, 32, 0.06) 15px 16px);
            overflow: hidden;
          }

          .ranking-bar__track span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #F05A28, #F6C65B);
            box-shadow: 0 0 14px rgba(240, 90, 40, 0.32);
          }

          .pulse-card {
            position: relative;
            overflow: hidden;
            padding: 8px 4px 8px 13px;
            border-radius: 0;
            background:
              linear-gradient(90deg, rgba(240,90,40,0.08), transparent 68%);
            border: 0;
            border-left: 2px solid rgba(240, 90, 40, 0.40);
            box-shadow: inset 0 -1px 0 rgba(226, 168, 88, 0.12);
          }

          .pulse-card::after {
            content: '';
            position: absolute;
            right: 10px;
            top: 12px;
            width: 62px;
            height: 62px;
            border-radius: 50%;
            border: 1px solid rgba(240, 90, 40, 0.12);
            box-shadow: inset 0 0 0 11px rgba(240, 90, 40, 0.028);
          }

          .pulse-card span,
          .pulse-card small {
            display: block;
            color: rgba(42, 37, 32, 0.48);
            font-size: 11px;
          }

          .pulse-card strong {
            display: block;
            margin: 6px 0;
            color: #C84B31;
            font-family: var(--font-serif);
            font-size: 23px;
          }

          .trend-wave {
            width: 100%;
            height: 34px;
            margin-top: 4px;
            border-bottom: 1px solid rgba(240, 90, 40, 0.14);
          }

          .trend-wave polyline {
            fill: none;
            stroke: #F05A28;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
          }

          .layer-dock {
            position: absolute;
            left: 50%;
            bottom: 26px;
            z-index: 20;
            display: flex;
            gap: 10px;
            width: auto;
            padding: 0;
            border-radius: 0;
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.30), rgba(255, 248, 229, 0.08));
            border: 0;
            box-shadow:
              0 14px 28px rgba(42, 37, 32, 0.08);
            backdrop-filter: blur(12px) saturate(120%);
            -webkit-backdrop-filter: blur(12px) saturate(120%);
            transform: translateX(-50%);
          }

          .layer-dock::before,
          .layer-dock::after {
            content: '';
            position: absolute;
            top: -1px;
            width: 64px;
            height: 1px;
            background: #F05A28;
          }

          .layer-dock::before {
            left: 0;
          }

          .layer-dock::after {
            right: 0;
          }

          .layer-dock__button {
            position: relative;
            min-width: 0;
            width: 84px;
            height: 58px;
            display: inline-grid;
            grid-template-columns: 1fr;
            align-items: center;
            justify-items: center;
            gap: 4px;
            padding: 6px;
            overflow: hidden;
            border: 1px solid rgba(201, 169, 110, 0.16);
            border-radius: 14px;
            color: rgba(42, 37, 32, 0.50);
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.66), rgba(255, 248, 229, 0.28));
            cursor: pointer;
            transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
          }

          .layer-dock__button {
            --layer-color: #F05A28;
            --layer-rgb: 240, 90, 40;
          }

          .layer-dock__button--traffic {
            --layer-color: #F05A28;
            --layer-rgb: 240, 90, 40;
          }

          .layer-dock__button--questions {
            --layer-color: #C84B31;
            --layer-rgb: 200, 75, 49;
          }

          .layer-dock__button--satisfaction {
            --layer-color: #D39A22;
            --layer-rgb: 211, 154, 34;
          }

          .layer-dock__button--route {
            --layer-color: #6A9C89;
            --layer-rgb: 106, 156, 137;
          }

          .layer-dock__button--consumption {
            --layer-color: #C9A96E;
            --layer-rgb: 201, 169, 110;
          }

          .layer-dock__button::before {
            content: '';
            position: absolute;
            left: 9px;
            right: 9px;
            bottom: 5px;
            height: 2px;
            border-radius: 999px;
            background: linear-gradient(90deg, transparent, rgba(var(--layer-rgb), 0.62), transparent);
            opacity: 0;
            transform: scaleX(0.42);
            transition: opacity 160ms ease, transform 160ms ease;
          }

          .layer-dock__button::after {
            content: '';
            position: absolute;
            inset: 3px;
            border-radius: 11px;
            border: 1px solid rgba(var(--layer-rgb), 0.18);
            opacity: 0;
            transition: opacity 160ms ease;
          }

          .layer-dock__button:hover {
            color: var(--layer-color);
            background: linear-gradient(180deg, rgba(var(--layer-rgb), 0.08), rgba(var(--layer-rgb), 0.03));
            transform: translateY(-1px);
          }

          .layer-dock__icon {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            flex: 0 0 24px;
            border-radius: 50%;
            color: var(--layer-color);
            font-size: 14px;
            background: rgba(var(--layer-rgb), 0.10);
            box-shadow: inset 0 0 0 1px rgba(var(--layer-rgb), 0.18);
          }

          .layer-dock__copy {
            display: grid;
            gap: 2px;
            gap: 3px;
            min-width: 0;
            text-align: center;
          }

          .layer-dock__copy b {
            overflow: hidden;
            color: rgba(42, 37, 32, 0.66);
            font-size: 10px;
            line-height: 1;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 800;
          }

          .layer-dock__copy small {
            display: block;
            overflow: hidden;
            color: var(--layer-color);
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 900;
            line-height: 1;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .layer-dock__copy small em {
            margin-left: 2px;
            color: rgba(42, 37, 32, 0.38);
            font-family: var(--font-family);
            font-size: 9px;
            font-style: normal;
            font-weight: 700;
          }

          .layer-dock__button--active {
            color: #fff;
            border-color: rgba(var(--layer-rgb), 0.42);
            background:
              radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.30), transparent 42%),
              linear-gradient(180deg, rgba(var(--layer-rgb), 0.98), rgba(var(--layer-rgb), 0.78));
            transform: translateY(-7px);
            box-shadow: 0 16px 28px rgba(var(--layer-rgb), 0.26), 0 0 0 7px rgba(var(--layer-rgb), 0.08);
          }

          .layer-dock__button--active::before {
            opacity: 1;
            transform: scaleX(1);
          }

          .layer-dock__button--active::after {
            opacity: 1;
          }

          .layer-dock__button--active .layer-dock__icon {
            color: #fff;
            background: rgba(255, 255, 255, 0.18);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.26), 0 0 16px rgba(255, 255, 255, 0.16);
          }

          .layer-dock__button--active .layer-dock__copy b,
          .layer-dock__button--active .layer-dock__copy small,
          .layer-dock__button--active .layer-dock__copy small em {
            color: #fff;
          }

          .sentiment-orb {
            display: grid;
            grid-template-columns: 78px 1fr;
            gap: 11px;
            align-items: center;
          }

          .sentiment-orb__ring {
            width: 78px;
            height: 78px;
            display: grid;
            place-items: center;
            align-content: center;
            border-radius: 50%;
            color: #C84B31;
            background:
              radial-gradient(circle, rgba(255,251,241,0.98) 50%, transparent 52%),
              conic-gradient(#F05A28 0 66%, #F6C65B 66% 82%, rgba(201,169,110,0.20) 82% 100%);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.84), 0 12px 24px rgba(42,37,32,0.08), 0 0 0 10px rgba(246, 198, 91, 0.055);
          }

          .sentiment-orb__ring strong {
            font-family: var(--font-serif);
            font-size: 23px;
            line-height: 1;
          }

          .sentiment-orb__ring span {
            color: rgba(42, 37, 32, 0.44);
            font-size: 11px;
          }

          .sentiment-orb b {
            display: block;
            margin-bottom: 6px;
            color: #2A2520;
          }

          .sentiment-orb small {
            display: block;
            color: rgba(42, 37, 32, 0.50);
            line-height: 1.5;
          }

          .sentiment-bars {
            display: flex;
            height: 8px;
            gap: 4px;
            margin-top: 10px;
            overflow: hidden;
            border-radius: 999px;
            padding: 1px;
            background: rgba(201, 169, 110, 0.12);
          }

          .sentiment-bars span:nth-child(1) { background: #6A9C89; }
          .sentiment-bars span:nth-child(2) { background: #C9A96E; }
          .sentiment-bars span:nth-child(3) { background: #C84B31; }

          .risk-list {
            display: grid;
            gap: 0;
          }

          .risk-item {
            position: relative;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 7px 4px 7px 12px;
            overflow: hidden;
            border-radius: 0;
            background: transparent;
            border: 0;
            box-shadow: inset 0 -1px 0 rgba(226, 168, 88, 0.12);
          }

          .risk-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #F05A28;
            opacity: 0.34;
          }

          .risk-item strong,
          .risk-item span {
            display: block;
          }

          .risk-item strong {
            color: #2A2520;
            font-size: 13px;
          }

          .risk-item span {
            margin-top: 3px;
            color: rgba(42, 37, 32, 0.44);
            font-size: 11px;
          }

          .risk-item b {
            color: #C84B31;
            font-family: var(--font-serif);
            font-size: 20px;
          }

          .suggestion-scroll {
            display: grid;
            gap: 0;
            margin-top: 6px;
            border-top: 1px solid rgba(226, 168, 88, 0.12);
          }

          .suggestion-item {
            display: grid;
            grid-template-columns: 26px 1fr;
            gap: 9px;
            padding: 7px 0;
            border-radius: 0;
            background: transparent;
            border: 0;
          }

          .suggestion-item span {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: rgba(200, 75, 49, 0.08);
            color: #C84B31;
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 800;
            box-shadow: inset 0 0 0 1px rgba(200, 75, 49, 0.16);
          }

          .suggestion-item p {
            margin: 0;
            display: -webkit-box;
            overflow: hidden;
            color: rgba(42, 37, 32, 0.66);
            font-size: 11px;
            line-height: 1.45;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          }

          .empty-hint {
            display: grid;
            place-items: center;
            min-height: 76px;
            color: rgba(42, 37, 32, 0.42);
            font-size: 12px;
            text-align: center;
            border-radius: 0;
            border: 1px dashed rgba(201, 169, 110, 0.22);
            background:
              repeating-linear-gradient(90deg, transparent 0 18px, rgba(201, 169, 110, 0.055) 18px 19px),
              rgba(255, 251, 241, 0.18);
          }

          @keyframes brainPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.25); opacity: 1; }
          }

          @keyframes panelScan {
            0%, 62% { transform: translateX(-130%); opacity: 0; }
            70% { opacity: 0.34; }
            86%, 100% { transform: translateX(130%); opacity: 0; }
          }

          @media (max-width: 1360px) {
            .smart-brain-grid {
              grid-template-columns: 280px minmax(560px, 1.25fr) 280px;
              gap: 10px;
            }

            .layer-dock {
              gap: 8px;
            }

            .layer-dock__button {
              width: 50px;
              height: 50px;
            }
          }

          @media (max-height: 820px) and (min-width: 1121px) {
            .operations-ribbon {
              grid-template-columns: 180px 1fr;
              padding-top: 6px;
              padding-bottom: 6px;
            }

            .operations-ribbon__advice {
              display: none;
            }

            .operations-ribbon__lead strong {
              font-size: 26px;
            }

            .operation-kpi strong {
              font-size: 20px;
            }

            .smart-brain-grid {
              min-height: max(640px, calc(100vh - 154px));
            }

            .metric-grid {
              gap: 0 7px;
            }

            .brain-panel {
              padding: 9px 8px 10px 12px;
            }

            .brain-panel__head {
              margin-bottom: 8px;
            }

            .brain-panel h3 {
              font-size: 15px;
            }

            .metric-tile {
              min-height: 52px;
              padding: 5px 4px 7px 10px;
            }

            .metric-tile strong {
              font-size: 19px;
              margin-top: 3px;
            }

            .metric-tile small {
              display: none;
            }

            .pulse-card {
              padding: 8px 4px 8px 10px;
            }

            .pulse-card strong {
              font-size: 20px;
            }

            .ranking-list {
              gap: 6px;
            }

            .ranking-bar__row {
              grid-template-columns: 28px minmax(0, 1fr) auto;
            }

            .ranking-bar__track {
              margin-left: 34px;
            }

            .sentiment-orb {
              grid-template-columns: 70px 1fr;
              gap: 10px;
            }

            .sentiment-orb__ring {
              width: 70px;
              height: 70px;
            }

            .sentiment-orb__ring strong {
              font-size: 21px;
            }

            .sentiment-orb small {
              line-height: 1.45;
            }

            .sentiment-bars {
              margin-top: 9px;
            }

            .risk-item {
              padding: 7px 4px 7px 11px;
            }

            .risk-item b {
              font-size: 19px;
            }

            .suggestion-scroll {
              margin-top: 6px;
            }

            .suggestion-item {
              grid-template-columns: 22px 1fr;
              gap: 7px;
              padding: 7px 0;
            }

            .suggestion-item span {
              width: 21px;
              height: 21px;
            }

            .suggestion-item p {
              line-height: 1.38;
            }

            .map-insight--question {
              display: none;
            }
          }

          @media (max-width: 1120px) {
            .smart-brain-shell {
              overflow: auto;
            }

            .operations-ribbon {
              grid-template-columns: 1fr;
            }

            .operations-ribbon__metrics {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .smart-brain-grid {
              min-height: 0;
              grid-template-columns: 1fr;
            }

            .brain-map-zone {
              min-height: 620px;
            }

            .map-insight {
              max-width: min(260px, 42vw);
            }
          }
        `}
      </style>
    </div>
  );
};

export default DashboardPage;
