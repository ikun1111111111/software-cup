import React from 'react';
import type { CultureImageCard as CultureImageCardType } from '../../types/themeCards';

interface Props {
  card: CultureImageCardType;
}

const CultureImageCard: React.FC<Props> = ({ card }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'relative' }}>
        {card.image ? (
          <img
            src={card.image}
            alt={card.title}
            style={{
              width: '100%',
              height: 170,
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
            }}
          />
        ) : (
          <div
            style={{
              height: 170,
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
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🪷</div>
              <div>文化主题配图</div>
            </div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'linear-gradient(180deg, rgba(26,22,20,0) 0%, rgba(26,22,20,0.35) 100%)',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          }}
        />
      </div>

      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--gray-50)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            fontFamily: 'var(--font-serif)',
            marginBottom: 10,
            color: 'var(--text-primary)',
            letterSpacing: 0.5,
          }}
        >
          {card.title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.9,
          }}
        >
          {card.description}
        </div>
      </div>
    </div>
  );
};

export default CultureImageCard;
