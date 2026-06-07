import React from 'react';

interface Props {
  level: 'low' | 'medium' | 'high';
  label?: string;
}

const config = {
  low: { emoji: '🟢', text: '空闲', color: '#22C55E', bg: '#F0FDF4' },
  medium: { emoji: '🟡', text: '适中', color: '#EAB308', bg: '#FEFCE8' },
  high: { emoji: '🔴', text: '拥挤', color: '#EF4444', bg: '#FEF2F2' },
};

const CrowdIndicator: React.FC<Props> = ({ level, label }) => {
  const c = config[level] || config.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 12, fontSize: 13,
      background: c.bg, color: c.color, fontWeight: 600,
    }}>
      {c.emoji} {label || c.text}
    </span>
  );
};

export default CrowdIndicator;
