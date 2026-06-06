import React, { useState, useEffect } from 'react';
import request from '../../api/request';

interface HourlyData {
  hour: number;
  predicted_visitors: number;
  crowd_level: string;
  emoji: string;
}

interface CrowdData {
  target_date: string;
  is_weekend: boolean;
  predictions: Record<string, HourlyData[]>;
}

const levelColors: Record<string, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#EF4444',
};

const CrowdHeatmap: React.FC = () => {
  const [data, setData] = useState<CrowdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    request.get('/analytics/crowd')
      .then((res) => {
        const d = (res as any).data ?? res;
        setData(d);
        const spots = Object.keys(d.predictions || {});
        if (spots.length > 0 && !selectedSpot) setSelectedSpot(spots[0]);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>加载客流数据中...</div>;
  }

  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>暂无客流预测数据</div>;
  }

  const spots = Object.keys(data.predictions);
  const hours = data.predictions[selectedSpot] || [];

  return (
    <div className="section-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🔥 客流热力预测</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
            {data.target_date} {data.is_weekend ? '(周末)' : '(工作日)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['low', 'medium', 'high'].map((lvl) => (
            <span key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: levelColors[lvl] }} />
              {lvl === 'low' ? '空闲' : lvl === 'medium' ? '适中' : '拥挤'}
            </span>
          ))}
        </div>
      </div>

      {/* Spot selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {spots.map((spot) => (
          <button
            key={spot}
            onClick={() => setSelectedSpot(spot)}
            style={{
              padding: '5px 14px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
              border: selectedSpot === spot ? 'none' : '1px solid var(--border-light)',
              background: selectedSpot === spot ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
              color: selectedSpot === spot ? '#fff' : 'var(--text-secondary)',
              fontWeight: selectedSpot === spot ? 600 : 400,
            }}
          >
            {spot}
          </button>
        ))}
      </div>

      {/* Hourly bars */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 160, padding: '0 4px' }}>
        {hours.map((h) => {
          const maxVisitors = Math.max(...hours.map((x) => x.predicted_visitors), 1);
          const height = Math.max((h.predicted_visitors / maxVisitors) * 140, 8);
          return (
            <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{h.predicted_visitors}</span>
              <div style={{
                width: '100%', height, borderRadius: '4px 4px 0 0',
                background: levelColors[h.crowd_level] || '#ccc',
                transition: 'height 300ms ease',
                minWidth: 16,
              }} />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{h.hour}:00</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrowdHeatmap;
