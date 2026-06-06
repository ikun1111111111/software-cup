import React, { useState, useEffect } from 'react';
import request from '../../api/request';

interface Props {
  spotName: string;
}

const BestTimeCard: React.FC<Props> = ({ spotName }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request.get('/analytics/crowd/best-time', { params: { attraction_name: spotName } })
      .then((res) => setData((res as any).data ?? res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [spotName]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="section-card" style={{ padding: '16px 20px', borderLeft: '4px solid #3B82F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>⏰</span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>最佳游览时段</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#1A5FB4', marginBottom: 4 }}>
        {data.best_time}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
        {data.reason}
      </p>
    </div>
  );
};

export default BestTimeCard;
