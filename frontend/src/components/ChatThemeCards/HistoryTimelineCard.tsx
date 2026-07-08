import React, { useMemo } from 'react';
import type { HistoryTimelineCard as HistoryTimelineCardType } from '../../types/themeCards';

interface Props {
  card: HistoryTimelineCardType;
}

const HistoryTimelineCard: React.FC<Props> = ({ card }) => {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof card.events>();
    card.events.forEach((event) => {
      const era = event.year.length >= 4 ? `${event.year.slice(0, event.year.length - 1)}` : event.year;
      if (!map.has(era)) map.set(era, []);
      map.get(era)!.push(event);
    });
    return Array.from(map.entries());
  }, [card.events]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--gray-50)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div style={{ fontSize: 28 }}>📜</div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              fontFamily: 'var(--font-serif)',
              color: 'var(--text-primary)',
            }}
          >
            灵山历史时间线
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            跨越千年的文化积淀
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div
          style={{
            position: 'absolute',
            left: 6,
            top: 8,
            bottom: 8,
            width: 2,
            background: 'linear-gradient(180deg, var(--color-vermilion) 0%, var(--border-medium, var(--border-light)) 100%)',
            borderRadius: 1,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {card.events.map((event, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                animation: `fadeInUp 400ms var(--ease-out-expo) ${idx * 80}ms both`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 3,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--color-vermilion)',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 2px rgba(200, 75, 49, 0.12)',
                }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--color-vermilion)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {event.year}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginTop: 4,
                  color: 'var(--text-primary)',
                }}
              >
                {event.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                  lineHeight: 1.7,
                }}
              >
                {event.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryTimelineCard;
