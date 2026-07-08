import React from 'react';
import type { TicketInfoCard as TicketInfoCardType } from '../../types/themeCards';

interface Props {
  card: TicketInfoCardType;
}

const TicketInfoCard: React.FC<Props> = ({ card }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-accent-bg) 0%, #fff 100%)',
          border: '1px solid rgba(200, 75, 49, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          🎫
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              fontFamily: 'var(--font-serif)',
              color: 'var(--text-primary)',
            }}
          >
            门票与开放时间
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            景区官方信息，出行前请再次确认
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {card.spots.map((spot) => (
          <div
            key={spot.id}
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gray-50)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 10,
                fontFamily: 'var(--font-serif)',
                color: 'var(--text-primary)',
              }}
            >
              {spot.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spot.ticket_info && (
                <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>票价：</span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{spot.ticket_info}</span>
                </div>
              )}
              {spot.open_time && (
                <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>开放时间：</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{spot.open_time}</span>
                </div>
              )}
              {spot.must_see && (
                <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>亮点：</span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{spot.must_see}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketInfoCard;
