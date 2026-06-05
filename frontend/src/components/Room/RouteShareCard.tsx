import React from 'react';
import { Card, Tag } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  BulbOutlined,
} from '@ant-design/icons';

interface RouteShareCardProps {
  routeName: string;
  spots: string[];
  duration: string;
  description?: string;
  recommendationReason?: string;
  gradient?: string;
}

/**
 * Displays a shared route card inside a collaborative room.
 * Used when someone pushes a recommended route to the room.
 */
const RouteShareCard: React.FC<RouteShareCardProps> = ({
  routeName,
  spots,
  duration,
  description,
  recommendationReason,
  gradient,
}) => {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 'var(--radius-md)',
        border: `1px solid var(--border-light)`,
        background: 'var(--surface-card)',
        marginBottom: '12px',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      {/* Route header */}
      <div
        style={{
          background: gradient || 'linear-gradient(135deg, #1A5FB4, #3584E4)',
          margin: '-12px -16px 12px -16px',
          padding: '12px 16px',
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '15px' }}>{routeName}</div>
        <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '3px' }}>
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          {duration}
          {recommendationReason && (
            <span style={{ marginLeft: '12px' }}>
              <BulbOutlined style={{ marginRight: '4px' }} />
              {recommendationReason}
            </span>
          )}
        </div>
      </div>

      {/* Spots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: description ? '10px' : 0 }}>
        {spots.map((spot, i) => (
          <Tag
            key={i}
            style={{
              margin: 0,
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)',
              background: 'var(--color-primary-bg)',
              fontSize: '12px',
            }}
          >
            <EnvironmentOutlined style={{ marginRight: '3px', fontSize: '10px' }} />
            {spot}
          </Tag>
        ))}
      </div>

      {description && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            padding: '8px',
            backgroundColor: 'var(--surface-bg)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <EyeOutlined style={{ marginRight: '6px', color: 'var(--text-tertiary)' }} />
          {description}
        </div>
      )}
    </Card>
  );
};

export default RouteShareCard;
