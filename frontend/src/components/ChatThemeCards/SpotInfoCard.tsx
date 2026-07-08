import React from 'react';
import type { SpotInfoCard as SpotInfoCardType } from '../../types/themeCards';

interface Props {
  card: SpotInfoCardType;
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
    <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{label}</span>
    <span style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{value}</span>
  </div>
);

const SpotInfoCard: React.FC<Props> = ({ card }) => {
  const { spot } = card;

  const infoRows: { label: string; value?: string }[] = [
    { label: '开放时间', value: spot.open_time },
    { label: '建议游玩', value: spot.duration },
    { label: '票务', value: spot.ticket_info },
    { label: '最佳时节', value: spot.best_time },
    { label: '必看', value: spot.must_see },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {spot.thumbnail ? (
        <img
          src={spot.thumbnail}
          alt={spot.name}
          style={{
            width: '100%',
            height: 150,
            objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
          }}
        />
      ) : (
        <div
          style={{
            height: 150,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 14,
            border: '1px dashed var(--border-light)',
          }}
        >
          🗿 景点配图
        </div>
      )}

      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            fontFamily: 'var(--font-serif)',
            marginBottom: 6,
            color: 'var(--text-primary)',
          }}
        >
          {spot.name}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {spot.category && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-accent-bg)',
                color: 'var(--color-accent)',
                fontWeight: 500,
              }}
            >
              {spot.category}
            </span>
          )}
          {spot.tags?.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--gray-100)',
                color: 'var(--text-secondary)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {spot.overview && (
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.8 }}>
          {spot.overview}
        </div>
      )}

      {spot.detail && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {spot.detail}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 14,
          borderRadius: 'var(--radius-md)',
          background: 'var(--gray-50)',
          border: '1px solid var(--border-light)',
        }}
      >
        {infoRows
          .filter((row) => !!row.value)
          .map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value!} />
          ))}
      </div>

      {spot.narration && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            padding: '12px 14px',
            borderLeft: '3px solid var(--color-vermilion)',
            background: 'var(--color-accent-bg)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            lineHeight: 1.7,
          }}
        >
          “{spot.narration}”
        </div>
      )}
    </div>
  );
};

export default SpotInfoCard;
