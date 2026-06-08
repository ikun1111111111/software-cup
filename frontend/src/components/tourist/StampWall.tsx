import React, { useState, useEffect } from 'react';
import { getStamps, type StampItem } from '../../api/puzzle';

interface Props {
  sessionId: string;
}

const StampWall: React.FC<Props> = ({ sessionId }) => {
  const [stamps, setStamps] = useState<StampItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStamps(sessionId)
      .then((res) => {
        const data = (res as any).data ?? res;
        setStamps(data.stamps || []);
      })
      .catch(() => setStamps([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载印章...</div>;

  const collected = stamps.filter((s) => s.collected).length;

  return (
    <div className="section-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🔖 印章墙</h3>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          {collected}/{stamps.length} 枚
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: 12,
      }}>
        {stamps.map((stamp) => (
          <div
            key={stamp.id}
            style={{
              aspectRatio: '1', borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: stamp.collected ? `${stamp.color}18` : 'rgba(0,0,0,0.03)',
              border: stamp.collected ? `2px solid ${stamp.color}` : '2px dashed #ddd',
              opacity: stamp.collected ? 1 : 0.4,
              transition: 'all 300ms ease',
              cursor: 'default',
            }}
          >
            <span style={{ fontSize: 28, marginBottom: 4 }}>{stamp.symbol}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: stamp.collected ? stamp.color : '#999',
            }}>
              {stamp.name}
            </span>
          </div>
        ))}
      </div>

      {collected === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 16, fontSize: 14 }}>
          游览景点并答对谜题即可收集印章 🔍
        </p>
      )}
    </div>
  );
};

export default StampWall;
