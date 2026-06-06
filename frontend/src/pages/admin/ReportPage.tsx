import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DownloadOutlined, FileTextOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import SentimentChart from '../../components/admin/SentimentChart';
import WordCloud from '../../components/admin/WordCloud';
import MarkdownRenderer from '../../components/admin/MarkdownRenderer';
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';
import {
  getTrends,
  getTopQuestions,
  triggerReport,
  getReportStatus,
  type TrendsItem,
  type TopQuestionItem,
  type ReportStatusResult,
} from '../../api/analytics';

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

const ReportPage: React.FC = () => {
  const [trends, setTrends] = useState<TrendsItem[]>([]);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [report, setReport] = useState<ReportStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMobile = false; // web-only

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trendsRes, questionsRes] = await Promise.all([
        getTrends(7),
        getTopQuestions(10),
      ]);
      setTrends(trendsRes);
      setTopQuestions(questionsRes);
      if (trendsRes.length > 0) {
        setStartDate(trendsRes[0].date);
        setEndDate(trendsRes[trendsRes.length - 1].date);
      }
    } catch (err: any) {
      message.error('加载数据失败: ' + (err?.message || '未知错误'));
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

  const startPolling = useCallback((taskId: string) => {
    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const status = await getReportStatus(taskId);
        if (status.status === 'done') {
          clearInterval(interval);
          pollRef.current = null;
          setReport(status);
          setGenerating(false);
          message.success({ content: '报告生成完成', key: 'report_gen', duration: 2 });
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
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setGenerating(true);
    setReport(null);
    try {
      const result = await triggerReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        days: 7,
      });
      message.loading({ content: '报告生成中，请稍候...', key: 'report_gen', duration: 0 });
      startPolling(result.taskId);
    } catch (err: any) {
      message.error({ content: '提交失败: ' + (err?.message || '未知错误'), key: 'report_gen' });
      setGenerating(false);
    }
  }, [startDate, endDate, startPolling]);

  const handleExport = useCallback(async () => {
    if (!report?.content) {
      message.info('请先生成报告');
      return;
    }
    const children = markdownToDocx(report.content);
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: '游客感受度分析报告',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          }),
          ...children,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `游客感受度报告-${report.period || '未命名'}.docx`);
    message.success('报告已导出');
  }, [report]);

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
        /###?\s*3?[.．、]?\s*知识库盲区发现/i,
        /###?\s*3?[.．、]?\s*盲区发现/i,
        /盲区发现/i,
      ],
      [
        /###?\s*4?[.．、]?\s*服务改进建议/i,
        /###?\s*4?[.．、]?\s*改进建议/i,
        /服务改进建议/i,
        /改进建议/i,
      ]
    );

  const parseSuggestions = (content: string): string[] =>
    parseSection(
      content,
      [
        /###?\s*4?[.．、]?\s*服务改进建议/i,
        /###?\s*4?[.．、]?\s*改进建议/i,
        /服务改进建议/i,
        /改进建议/i,
      ],
      []
    );

  const blindSpots = report?.content ? parseBlindSpots(report.content) : [];
  const suggestions = report?.content ? parseSuggestions(report.content) : [];

  return (
    <div data-testid="report-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
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
            <h1 className="font-serif" style={{
              margin: '0 0 4px 0',
              fontSize: isMobile ? '20px' : '26px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.5px',
            }}>
              游客感受度报告
            </h1>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
              {report?.period || (startDate && endDate ? `${startDate} 至 ${endDate}` : '请选择日期范围')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              data-testid="generate-btn"
              onClick={handleGenerateReport}
              disabled={generating || loading}
              style={{
                padding: '8px 22px',
                backgroundColor: generating || loading ? 'var(--gray-300)' : 'var(--accent)',
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
                boxShadow: generating || loading ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <FileTextOutlined />
              {generating ? '生成中...' : '生成报告'}
            </button>
            <button
              data-testid="export-btn"
              onClick={handleExport}
              disabled={!report?.content}
              style={{
                padding: '8px 22px',
                backgroundColor: !report?.content ? 'var(--gray-300)' : 'var(--color-success)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: !report?.content ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
              }}
            >
              <DownloadOutlined />
              导出报告
            </button>
          </div>
        </div>

        {report?.content && (
          <GlassCard style={{ marginBottom: 24 }}>
            <div data-testid="summary-section">
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                报告摘要
              </h3>
              <MarkdownRenderer content={report.content} />
            </div>
          </GlassCard>
        )}

        {!report?.content && !generating && (
          <GlassCard style={{ marginBottom: 24, padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            暂无报告，请点击右上角生成
          </GlassCard>
        )}

        {generating && !report?.content && (
          <GlassCard style={{ marginBottom: 24, padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            报告生成中，请稍候...
          </GlassCard>
        )}

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
          marginBottom: '24px',
        }}>
          <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <SentimentChart data={trends} />
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <WordCloud words={wordCloudData} />
          </GlassCard>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
        }}>
          <GlassCard style={{ flex: 1, padding: '20px' }}>
            <div data-testid="blind-spots">
              <h3 style={{
                margin: '0 0 14px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <WarningOutlined style={{ color: 'var(--color-error)' }} />
                盲区发现
              </h3>
              {blindSpots.length > 0 ? (
                <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
                  {blindSpots.map((spot, index) => (
                    <li key={index} style={{
                      marginBottom: '10px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      position: 'relative',
                      paddingLeft: '14px',
                      lineHeight: 1.6,
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-error)',
                      }} />
                      {spot}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                  {report?.content ? '未从报告中解析到盲区数据' : '请生成报告后查看'}
                </div>
              )}
            </div>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: '20px' }}>
            <div data-testid="suggestions">
              <h3 style={{
                margin: '0 0 14px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
                服务建议
              </h3>
              {suggestions.length > 0 ? (
                <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
                  {suggestions.map((suggestion, index) => (
                    <li key={index} style={{
                      marginBottom: '10px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      position: 'relative',
                      paddingLeft: '14px',
                      lineHeight: 1.6,
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-success)',
                      }} />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                  {report?.content ? '未从报告中解析到建议数据' : '请生成报告后查看'}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    </div>
  );
};

export default ReportPage;
