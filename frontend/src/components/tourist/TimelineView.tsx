import React, { useState, useEffect } from 'react';
import { getTimeline, getTodayInHistory, type TimelineEvent } from '../../api/history';

const eraColors: Record<string, string> = {
  '唐代': '#B45309',
  '北宋': '#1E40AF',
  '南宋': '#7C3AED',
  '元代': '#059669',
  '明代': '#DC2626',
  '清末': '#6B7280',
  '现代': '#1A5FB4',
};

const TimelineView: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [eras, setEras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEra, setActiveEra] = useState('');
  const [todayCard, setTodayCard] = useState<any>(null);

  useEffect(() => {
    Promise.all([getTimeline(), getTodayInHistory()])
      .then(([tlRes, tcRes]) => {
        const tl = (tlRes as any).data ?? tlRes;
        const tc = (tcRes as any).data ?? tcRes;
        setEvents(tl.events || []);
        setEras(tl.eras || []);
        setTodayCard(tc.card || tc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeEra ? events.filter((e) => e.era === activeEra) : events;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>加载历史时间线...</div>;

  return (
    <div>
      {/* Today in history card */}
      {todayCard && (
        <div className="section-card" style={{ padding: '18px 24px', marginBottom: 20, borderLeft: '4px solid #C8882E' }}>
          <div style={{ fontSize: 13, color: '#B45309', fontWeight: 600, marginBottom: 6 }}>📜 那年今日</div>
          <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{todayCard.title}</h4>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {todayCard.year_ago} — {todayCard.description}
          </p>
        </div>
      )}

      {/* Era filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          onClick={() => setActiveEra('')}
          style={{
            padding: '6px 14px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
            border: !activeEra ? 'none' : '1px solid var(--border-light)',
            background: !activeEra ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
            color: !activeEra ? '#fff' : 'var(--text-secondary)',
          }}
        >
          全部朝代
        </button>
        {eras.map((era) => (
          <button
            key={era}
            onClick={() => setActiveEra(era)}
            style={{
              padding: '6px 14px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
              border: activeEra === era ? 'none' : '1px solid var(--border-light)',
              background: activeEra === era ? (eraColors[era] || '#666') : 'rgba(255,255,255,0.6)',
              color: activeEra === era ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {era}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 11, top: 0, bottom: 0, width: 2,
          background: 'linear-gradient(180deg, #C8882E 0%, #1A5FB4 100%)',
        }} />

        {filtered.map((event, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: 24 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -22, top: 6, width: 14, height: 14,
              borderRadius: '50%', border: '3px solid #fff',
              background: eraColors[event.era] || '#999',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
            }} />
            <div className="section-card" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 8,
                  background: `${eraColors[event.era] || '#999'}18`,
                  color: eraColors[event.era] || '#666', fontWeight: 600,
                }}>
                  {event.era} · {event.year}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{event.spot}</span>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>{event.event}</h4>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
