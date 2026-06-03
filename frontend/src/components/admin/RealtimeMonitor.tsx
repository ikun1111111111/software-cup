import React, { useCallback, useEffect, useState } from 'react';
import { SyncOutlined } from '@ant-design/icons';

export interface RealtimeData {
  activeUsers: number;
  messagesPerMinute: number;
  avgResponseTime: number;
  sentimentScore: number;
}

export interface RealtimeMonitorProps {
  data?: RealtimeData;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const DEFAULT_DATA: RealtimeData = {
  activeUsers: 0,
  messagesPerMinute: 0,
  avgResponseTime: 0,
  sentimentScore: 0,
};

const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({
  data: propData,
  onConnect,
  onDisconnect,
}) => {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<RealtimeData>(propData || DEFAULT_DATA);

  useEffect(() => {
    if (propData) {
      setData(propData);
    }
  }, [propData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnected(true);
      onConnect?.();

      const interval = setInterval(() => {
        setData({
          activeUsers: Math.floor(Math.random() * 100),
          messagesPerMinute: Math.floor(Math.random() * 50),
          avgResponseTime: Math.floor(Math.random() * 200),
          sentimentScore: 0.7 + Math.random() * 0.3,
        });
      }, 3000);

      return () => clearInterval(interval);
    }, 1000);

    return () => {
      clearTimeout(timer);
      onDisconnect?.();
    };
  }, [onConnect, onDisconnect]);

  const metrics = [
    { label: '活跃用户', value: data.activeUsers, color: 'var(--color-primary)', testId: 'metric-active-users' },
    { label: '消息/分钟', value: data.messagesPerMinute, color: 'var(--color-success)', testId: 'metric-messages' },
    { label: '响应时间(ms)', value: data.avgResponseTime, color: 'var(--color-warning)', testId: 'metric-response-time' },
    { label: '情感分数', value: data.sentimentScore.toFixed(2), color: '#8B5CF6', testId: 'metric-sentiment' },
  ];

  return (
    <div data-testid="realtime-monitor" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <SyncOutlined style={{ color: 'var(--color-primary)' }} />
          实时监控
        </h3>
        <span
          data-testid="connection-status"
          className="badge"
          style={{
            backgroundColor: connected ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            color: connected ? 'var(--color-success)' : 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: connected ? 'var(--color-success)' : 'var(--color-error)',
          }} />
          {connected ? '已连接' : '未连接'}
        </span>
      </div>

      <div data-testid="metrics-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        {metrics.map((m) => (
          <div key={m.testId} data-testid={m.testId} style={{
            padding: '14px',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-elevated)',
          }}>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
              fontWeight: 500,
            }}>
              {m.label}
            </div>
            <div className="font-mono" style={{
              fontSize: '24px',
              fontWeight: 700,
              color: m.color,
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimeMonitor;
