import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DownloadOutlined,
  FileTextOutlined,
  LoadingOutlined,
  FileSearchOutlined,
  BulbOutlined,
  CalendarOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import SentimentChart from '../../components/admin/SentimentChart';
import MarkdownRenderer from '../../components/admin/MarkdownRenderer';
import PaperPanel from '../../components/admin/PaperPanel';
import InscriptionList from '../../components/admin/InscriptionList';
import StampCloud from '../../components/admin/StampCloud';
import PageTransition from '../../components/admin/PageTransition';
import {
  getTrends,
  getTopQuestions,
  getMobileTourSummary,
  generateReportArchive,
  getLatestReportArchive,
  getReportArchive,
  getReportArchiveStatus,
  listReportArchives,
  type TrendsItem,
  type TopQuestionItem,
  type MobileTourSummary,
  type ReportArchive,
  type ReportType,
} from '../../api/analytics';
import type { MarketingAnalysis } from '../../api/behavior';

function parseInlineToRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return new TextRun({ text: part.slice(1, -1), italics: true });
    }
    return new TextRun({ text: part });
  });
}

function markdownToDocx(content: string): Paragraph[] {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '---' || trimmed === '***') {
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let heading: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1;
      if (level === 2) heading = HeadingLevel.HEADING_2;
      else if (level === 3) heading = HeadingLevel.HEADING_3;
      else if (level >= 4) heading = HeadingLevel.HEADING_4;
      children.push(
        new Paragraph({
          text: headingMatch[2],
          heading,
          spacing: { after: 120 },
        })
      );
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const text = trimmed.slice(2);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '• ' }), ...parseInlineToRuns(text)],
          spacing: { after: 80 },
          indent: { left: 360 },
        })
      );
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${orderedMatch[1]}. ` }), ...parseInlineToRuns(orderedMatch[2])],
          spacing: { after: 80 },
          indent: { left: 360 },
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: parseInlineToRuns(trimmed),
        spacing: { after: 100 },
      })
    );
  }

  return children;
}

function formatArchiveTime(value?: string | null): string {
  if (!value) return '未生成';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function marketingFromArchive(archive: ReportArchive | null): MarketingAnalysis | null {
  const stats: any = archive?.stats;
  if (!stats) return null;
  const persona = stats.persona ?? {};
  const riskSpots = stats.risk_spots ?? stats.riskSpots ?? [];
  return {
    persona: {
      label: persona.label ?? '样本观察中',
      avgCost: persona.avg_cost ?? persona.avgCost ?? 0,
      avgStayDuration: persona.avg_stay_duration ?? persona.avgStayDuration ?? 0,
      avgSatisfaction: persona.avg_satisfaction ?? persona.avgSatisfaction ?? 0,
    },
    recommendedRoute: stats.recommended_route ?? stats.recommendedRoute ?? null,
    riskSpots: riskSpots.map((item: any) => ({
      name: item.name,
      visits: item.visits ?? 0,
      avgSatisfaction: item.avg_satisfaction ?? item.avgSatisfaction ?? 0,
    })),
    suggestions: stats.suggestions ?? [],
    report: archive?.content ? {
      content: archive.content,
      period: archive.periodText ?? '存档报告',
      generated_at: archive.generatedAt ?? undefined,
    } : undefined,
  };
}

const ReportPage: React.FC = () => {
  const [trends, setTrends] = useState<TrendsItem[]>([]);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [report, setReport] = useState<ReportArchive | null>(null);
  const [marketingReport, setMarketingReport] = useState<ReportArchive | null>(null);
  const [archives, setArchives] = useState<ReportArchive[]>([]);
  const [marketingArchives, setMarketingArchives] = useState<ReportArchive[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<ReportType>('sentiment');
  const [marketing, setMarketing] = useState<MarketingAnalysis | null>(null);
  const [mobileSummary, setMobileSummary] = useState<MobileTourSummary | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMobile = false; // web-only

  const loadArchives = useCallback(async () => {
    const [latestSentiment, latestMarketing, sentimentList, marketingList] = await Promise.all([
      getLatestReportArchive('sentiment'),
      getLatestReportArchive('marketing'),
      listReportArchives({ reportType: 'sentiment', pageSize: 8 }),
      listReportArchives({ reportType: 'marketing', pageSize: 8 }),
    ]);
    setReport(latestSentiment);
    setMarketingReport(latestMarketing);
    setMarketing(marketingFromArchive(latestMarketing));
    setArchives(sentimentList.items);
    setMarketingArchives(marketingList.items);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trendsRes, questionsRes, mobileSummaryRes] = await Promise.all([
        getTrends(7),
        getTopQuestions(10),
        getMobileTourSummary(7),
      ]);
      setTrends(trendsRes);
      setTopQuestions(questionsRes);
      setMobileSummary(mobileSummaryRes);
      if (trendsRes.length > 0) {
        setStartDate(trendsRes[0].date);
        setEndDate(trendsRes[trendsRes.length - 1].date);
      }
      await loadArchives();
    } catch (err: any) {
      message.error('加载数据失败: ' + (err?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [loadArchives]);

  useEffect(() => {
    loadData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadData]);

  const reportScopeText = mobileSummary?.totalEvents
    ? `本期报告已纳入近 7 日移动端 ${mobileSummary.totalEvents.toLocaleString()} 条导览事件，并结合 Web 大屏问答热点生成运营建议。`
    : '本期报告以 Web 大屏问答与导入行为数据为主；移动端事件接入后会自动并入报告口径。';

  const currentReport = activeTab === 'marketing' ? marketingReport : report;
  const currentArchives = activeTab === 'marketing' ? marketingArchives : archives;
  const currentContent = currentReport?.content ?? null;
  const currentPeriod = currentReport?.periodText
    || (currentReport?.generatedAt ? formatArchiveTime(currentReport.generatedAt) : null)
    || (startDate && endDate ? `${startDate} 至 ${endDate}` : '等待生成报告');

  const startPolling = useCallback((reportId: number, reportType: ReportType) => {
    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const status = await getReportArchiveStatus(reportId);
        if (status.status === 'done') {
          clearInterval(interval);
          pollRef.current = null;
          if (reportType === 'marketing') {
            setMarketingReport(status);
            setMarketing(marketingFromArchive(status));
          } else {
            setReport(status);
          }
          await loadArchives();
          setGenerating(false);
          message.success({ content: '报告生成完成', key: 'report_gen', duration: 2 });
        } else if (status.status === 'failed') {
          clearInterval(interval);
          pollRef.current = null;
          setGenerating(false);
          message.error({ content: status.errorMessage || '报告生成失败，请稍后重试', key: 'report_gen', duration: 3 });
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          pollRef.current = null;
          setGenerating(false);
          message.warning('报告生成超时，请稍后手动刷新');
        } else {
          // Update loading message with progress
          message.loading({
            content: `报告生成中，已等待 ${Math.round((attempts * 5) / 60)} 分钟...`,
            key: 'report_gen',
            duration: 0,
          });
        }
      } catch {
        // continue polling
      }
    }, 5000);
    pollRef.current = interval;
  }, [loadArchives]);

  const handleGenerateReport = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setGenerating(true);
    try {
      const result = await generateReportArchive({
        reportType: activeTab,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        days: 7,
      });
      message.loading({ content: '报告生成中，请稍候...', key: 'report_gen', duration: 0 });
      startPolling(result.reportId, activeTab);
    } catch (err: any) {
      message.error({ content: '提交失败: ' + (err?.message || '未知错误'), key: 'report_gen' });
      setGenerating(false);
    }
  }, [activeTab, startDate, endDate, startPolling]);

  const handleSelectArchive = useCallback(async (archive: ReportArchive) => {
    try {
      const detail = await getReportArchive(archive.id);
      if (detail.reportType === 'marketing') {
        setMarketingReport(detail);
        setMarketing(marketingFromArchive(detail));
      } else {
        setReport(detail);
      }
    } catch (err: any) {
      message.error('加载报告存档失败: ' + (err?.message || '未知错误'));
    }
  }, []);

  const handleExport = useCallback(async () => {
    const exportContent = currentContent;
    if (!exportContent) {
      message.info('请先生成报告');
      return;
    }
    const children = markdownToDocx(exportContent);
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: activeTab === 'marketing' ? '游客营销决策报告' : '游客感受度分析报告',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          }),
          ...children,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${activeTab === 'marketing' ? '游客营销决策报告' : '游客感受度报告'}-${currentReport?.periodText || '未命名'}.docx`);
    message.success('报告已导出');
  }, [activeTab, currentContent, currentReport]);

  const wordCloudData = topQuestions.map((q) => ({ text: q.question, value: q.count }));

  const parseSection = (
    content: string,
    startPatterns: RegExp[],
    endPatterns: RegExp[]
  ): string[] => {
    let startIdx = -1;
    for (const pattern of startPatterns) {
      const m = content.match(pattern);
      if (m && m.index !== undefined) {
        startIdx = m.index + m[0].length;
        break;
      }
    }
    if (startIdx === -1) return [];

    const afterStart = content.slice(startIdx);
    let endIdx = afterStart.length;
    for (const pattern of endPatterns) {
      const m = afterStart.match(pattern);
      if (m && m.index !== undefined) {
        endIdx = m.index;
        break;
      }
    }

    const section = afterStart.slice(0, endIdx);
    const lines = section
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-') || l.startsWith('•') || /^\d+[.．、]/.test(l));
    return lines.map((l) => l.replace(/^[-•\d.．、\s]+/, '').trim()).filter(Boolean);
  };

  const parseBlindSpots = (content: string): string[] =>
    parseSection(
      content,
      [
        /#{0,3}\s*3?[.．、]?\s*知识库盲区发现/i,
        /#{0,3}\s*3?[.．、]?\s*盲区发现/i,
        /知识库盲区/i,
        /盲区发现/i,
      ],
      [
        /#{0,3}\s*4?[.．、]?\s*服务改进建议/i,
        /#{0,3}\s*4?[.．、]?\s*改进建议/i,
        /服务改进建议/i,
        /改进建议/i,
      ]
    );

  const parseSuggestions = (content: string): string[] =>
    parseSection(
      content,
      [
        /#{0,3}\s*4?[.．、]?\s*服务改进建议/i,
        /#{0,3}\s*4?[.．、]?\s*改进建议/i,
        /服务改进建议/i,
        /改进建议/i,
      ],
      []
    );

  const blindSpots = report?.content ? parseBlindSpots(report.content) : [];
  const suggestions = report?.content ? parseSuggestions(report.content) : [];

  const blindSpotItems = blindSpots.map((spot, index) => ({
    id: `blind-${index}`,
    number: index + 1,
    text: spot,
    highlight: index < 3,
  }));

  const suggestionItems = suggestions.map((suggestion, index) => ({
    id: `suggestion-${index}`,
    number: index + 1,
    text: suggestion,
    highlight: index < 3,
  }));

  return (
    <div data-testid="report-page" className="animate-scroll-unfold" style={{
      padding: isMobile ? '16px' : '32px',
      maxWidth: 1440,
      margin: '0 auto',
    }}>
      <PageTransition>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: isMobile ? '20px' : '26px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-serif)',
            }}>
              {activeTab === 'marketing' ? '游客营销决策报告' : '游客感受度报告'}
            </h1>
            <span style={{
              fontSize: '14px',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
            }}>
              <CalendarOutlined style={{ fontSize: '12px', opacity: 0.7 }} />
              {currentPeriod}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              data-testid="generate-btn"
              onClick={handleGenerateReport}
              disabled={generating || loading}
              style={{
                padding: '8px 22px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: generating || loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
                opacity: generating || loading ? 0.45 : 1,
                boxShadow: generating || loading ? 'none' : '0 2px 8px rgba(200,75,49,0.25)',
              }}
            >
              <FileTextOutlined />
              {generating ? '生成中...' : activeTab === 'marketing' ? '生成营销报告' : '生成报告'}
            </button>
            <button
              data-testid="export-btn"
              onClick={handleExport}
              disabled={!currentContent}
              style={{
                padding: '8px 22px',
                backgroundColor: 'var(--mountain-mid)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: !currentContent ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
                opacity: !currentContent ? 0.45 : 1,
              }}
            >
              <DownloadOutlined />
              导出报告
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--ink-dark)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
          {[
            { key: 'sentiment' as const, label: '感受度报告' },
            { key: 'marketing' as const, label: '营销决策' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === tab.key ? 'rgba(243,239,230,0.1)' : 'transparent',
                color: activeTab === tab.key ? 'var(--gold-leaf)' : 'rgba(243,239,230,0.55)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <PaperPanel title="双端报告口径" withScrollHead style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'Web 问答趋势', value: `${trends.reduce((sum, item) => sum + item.interactions, 0).toLocaleString()} 次`, hint: '近 7 日互动趋势' },
              { label: '高频问题', value: `${topQuestions.length} 类`, hint: '用于提炼知识盲区' },
              { label: '移动导览事件', value: `${(mobileSummary?.totalEvents ?? 0).toLocaleString()} 条`, hint: '路线、景点、讲解、反馈' },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(184,115,51,0.12)', background: 'rgba(255,253,247,0.62)' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{item.label}</span>
                <strong style={{ display: 'block', marginTop: 6, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: 22 }}>{item.value}</strong>
                <small style={{ display: 'block', marginTop: 4, color: 'var(--text-tertiary)' }}>{item.hint}</small>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(106,156,137,0.10)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {reportScopeText}
          </div>
        </PaperPanel>

        <PaperPanel title="报告存档" style={{ marginBottom: 24 }}>
          {currentArchives.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
            }}>
              {currentArchives.map((item) => {
                const active = currentReport?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectArchive(item)}
                    style={{
                      width: '100%',
                      minHeight: 74,
                      padding: '12px 14px',
                      textAlign: 'left',
                      border: active ? '1px solid rgba(200,75,49,0.45)' : '1px solid rgba(184,115,51,0.14)',
                      borderRadius: 8,
                      background: active ? 'rgba(200,75,49,0.08)' : 'rgba(255,253,247,0.66)',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                    }}>
                      <span>{item.triggerSource === 'scheduled' ? '自动生成' : '手动生成'}</span>
                      <span>{item.status === 'done' ? '已完成' : item.status === 'failed' ? '失败' : '生成中'}</span>
                    </span>
                    <strong style={{
                      display: 'block',
                      marginTop: 6,
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.periodText || formatArchiveTime(item.createdAt)}
                    </strong>
                    <small style={{ display: 'block', marginTop: 4, color: 'var(--text-tertiary)' }}>
                      {formatArchiveTime(item.generatedAt || item.createdAt)}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', padding: '18px 0' }}>
              暂无报告存档。每天 18:00 会自动生成，也可以点击右上角手动生成。
            </div>
          )}
        </PaperPanel>

        {activeTab === 'marketing' && (
          <>
            <PaperPanel title="营销决策报告" withScrollHead style={{ marginBottom: 24 }}>
              {marketingReport?.content ? (
                <MarkdownRenderer content={marketingReport.content} />
              ) : generating ? (
                <div style={{ color: 'var(--text-tertiary)', padding: '24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LoadingOutlined />
                  正在生成营销决策报告，请稍候...
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', padding: '24px 0' }}>暂无营销报告存档。点击右上角「生成营销报告」后会保存到数据库。</div>
              )}
            </PaperPanel>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
              <PaperPanel title="客群画像">
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                  {marketing?.persona.label ?? '样本观察中'}
                </div>
                <div style={{ color: 'var(--text-tertiary)', lineHeight: 1.9 }}>
                  人均消费：{marketing?.persona.avgCost ?? 0} 元<br />
                  平均停留：{marketing?.persona.avgStayDuration ?? 0} 分钟<br />
                  满意度：{marketing?.persona.avgSatisfaction ?? 0}/5
                </div>
              </PaperPanel>
              <PaperPanel title="建议清单">
                <InscriptionList
                  items={(marketing?.suggestions ?? []).map((item, index) => ({
                    id: `marketing-${index}`,
                    number: index + 1,
                    text: item,
                    highlight: index < 3,
                  }))}
                />
              </PaperPanel>
            </div>
          </>
        )}

        {activeTab === 'sentiment' && report?.content && (
          <PaperPanel title="报告摘要" withScrollHead style={{ marginBottom: 24 }}>
            <div data-testid="summary-section">
              <MarkdownRenderer content={report.content} />
            </div>
          </PaperPanel>
        )}

        {activeTab === 'sentiment' && !report?.content && !generating && (
          <PaperPanel style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              gap: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(200, 75, 49, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileSearchOutlined style={{ fontSize: 28, color: 'var(--vermilion)', opacity: 0.6 }} />
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}>
                  暂无分析报告
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  maxWidth: 320,
                  lineHeight: 1.6,
                }}>
                  点击右上角「生成报告」按钮，系统将基于近期交互数据生成游客感受度分析
                </div>
              </div>
            </div>
          </PaperPanel>
        )}

        {activeTab === 'sentiment' && generating && !report?.content && (
          <PaperPanel style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              gap: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(201, 169, 110, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <LoadingOutlined style={{ fontSize: 28, color: 'var(--gold-leaf)' }} className="animate-spin" />
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}>
                  正在生成分析报告
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  maxWidth: 320,
                  lineHeight: 1.6,
                }}>
                  系统正在分析近期交互数据，提取情感趋势与知识盲区，请稍候...
                </div>
              </div>
            </div>
          </PaperPanel>
        )}

        {activeTab === 'sentiment' && <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
          marginBottom: '24px',
        }}>
          <PaperPanel style={{ flex: 1 }}>
            <SentimentChart data={trends} />
          </PaperPanel>
          <PaperPanel style={{ flex: 1 }}>
            <StampCloud items={wordCloudData} />
          </PaperPanel>
        </div>}

        {activeTab === 'sentiment' && <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
        }}>
          <PaperPanel title="盲区发现" style={{ flex: 1 }}>
            <div data-testid="blind-spots">
              {blindSpots.length > 0 ? (
                <InscriptionList items={blindSpotItems} />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 16px',
                  gap: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(128, 128, 128, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <EyeInvisibleOutlined style={{ fontSize: 20, color: 'var(--text-tertiary)', opacity: 0.7 }} />
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    lineHeight: 1.5,
                  }}>
                    {report?.content ? '未从报告中解析到盲区数据' : '请生成报告后查看'}
                  </div>
                </div>
              )}
            </div>
          </PaperPanel>
          <PaperPanel title="服务建议" style={{ flex: 1 }}>
            <div data-testid="suggestions">
              {suggestions.length > 0 ? (
                <InscriptionList items={suggestionItems} />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 16px',
                  gap: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(74, 124, 111, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <BulbOutlined style={{ fontSize: 20, color: 'var(--mountain-mid)', opacity: 0.7 }} />
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    lineHeight: 1.5,
                  }}>
                    {report?.content ? '未从报告中解析到建议数据' : '请生成报告后查看'}
                  </div>
                </div>
              )}
            </div>
          </PaperPanel>
        </div>}
      </PageTransition>
    </div>
  );
};

export default ReportPage;
