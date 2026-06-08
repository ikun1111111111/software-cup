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
              游客感受度报告
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
              {generating ? '生成中...' : '生成报告'}
            </button>
            <button
              data-testid="export-btn"
              onClick={handleExport}
              disabled={!report?.content}
              style={{
                padding: '8px 22px',
                backgroundColor: 'var(--mountain-mid)',
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
                opacity: !report?.content ? 0.45 : 1,
              }}
            >
              <DownloadOutlined />
              导出报告
            </button>
          </div>
        </div>

        {report?.content && (
          <PaperPanel title="报告摘要" withScrollHead style={{ marginBottom: 24 }}>
            <div data-testid="summary-section">
              <MarkdownRenderer content={report.content} />
            </div>
          </PaperPanel>
        )}

        {!report?.content && !generating && (
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

        {generating && !report?.content && (
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

        <div style={{
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
        </div>

        <div style={{
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
        </div>
      </PageTransition>
    </div>
  );
};

export default ReportPage;
