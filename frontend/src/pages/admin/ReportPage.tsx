import React, { useCallback, useEffect, useState } from 'react';
import { DownloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import SentimentChart from '../../components/admin/SentimentChart';
import WordCloud from '../../components/admin/WordCloud';

interface ReportData {
  title: string;
  date: string;
  summary: string;
  sentimentData: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  wordCloudData: Array<{ text: string; value: number }>;
  blindSpots: string[];
  suggestions: string[];
}

const MOCK_REPORT: ReportData = {
  title: '灵山景区感受度报告',
  date: '2024年1月',
  summary: '本月游客整体满意度较高，正面情感占比72%，较上月提升5%。主要关注点集中在灵山大佛、梵宫等核心景点。',
  sentimentData: [
    { date: '2024-01-15', positive: 65, negative: 15, neutral: 20 },
    { date: '2024-01-16', positive: 70, negative: 10, neutral: 20 },
    { date: '2024-01-17', positive: 60, negative: 20, neutral: 20 },
    { date: '2024-01-18', positive: 75, negative: 10, neutral: 15 },
    { date: '2024-01-19', positive: 80, negative: 5, neutral: 15 },
  ],
  wordCloudData: [
    { text: '灵山大佛', value: 100 },
    { text: '梵宫', value: 80 },
    { text: '九龙灌浴', value: 70 },
    { text: '门票', value: 60 },
    { text: '交通', value: 50 },
  ],
  blindSpots: [
    '停车场指示不够清晰',
    '部分区域缺乏无障碍设施',
    '餐饮选择较少',
  ],
  suggestions: [
    '增加停车场指引标识',
    '完善无障碍通道建设',
    '引入更多餐饮品牌',
  ],
};

const ReportPage: React.FC = () => {
  const [report] = useState<ReportData>(MOCK_REPORT);
  const [exporting, setExporting] = useState(false);
  const isMobile = false; // web-only

  useEffect(() => {
  }, []);

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
    }, 2000);
  }, []);

  return (
    <div data-testid="report-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
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
            fontSize: isMobile ? '18px' : '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {report.title}
          </h1>
          <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{report.date}</span>
        </div>
        <button
          data-testid="export-btn"
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '8px 22px',
            backgroundColor: exporting ? 'var(--gray-300)' : 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 200ms',
            boxShadow: exporting ? 'none' : '0 2px 8px rgba(26, 95, 180, 0.25)',
          }}
        >
          <DownloadOutlined />
          {exporting ? '导出中...' : '导出报告'}
        </button>
      </div>

      <div data-testid="summary-section" className="section-card" style={{
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h3 style={{
          margin: '0 0 10px 0',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          摘要
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          fontSize: '14px',
        }}>
          {report.summary}
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '20px',
        marginBottom: '24px',
      }}>
        <div className="section-card" style={{ flex: 1 }}>
          <SentimentChart data={report.sentimentData} />
        </div>
        <div className="section-card" style={{ flex: 1 }}>
          <WordCloud words={report.wordCloudData} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '20px',
      }}>
        <div data-testid="blind-spots" className="section-card" style={{ flex: 1, padding: '20px' }}>
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
          <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
            {report.blindSpots.map((spot, index) => (
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
        </div>
        <div data-testid="suggestions" className="section-card" style={{ flex: 1, padding: '20px' }}>
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
          <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
            {report.suggestions.map((suggestion, index) => (
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
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
