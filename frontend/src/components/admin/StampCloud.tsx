import React, { useCallback, useMemo } from 'react';

export interface StampItem {
  text: string;
  value: number;
}

export interface StampCloudProps {
  items?: StampItem[];
  onStampClick?: (text: string) => void;
}

const MOCK_ITEMS: StampItem[] = [
  { text: '灵山大佛', value: 100 },
  { text: '梵宫', value: 80 },
  { text: '九龙灌浴', value: 70 },
  { text: '门票', value: 60 },
  { text: '交通', value: 50 },
  { text: '美食', value: 45 },
  { text: '住宿', value: 40 },
  { text: '停车', value: 35 },
  { text: '开放时间', value: 30 },
  { text: '导游', value: 25 },
];

const STAMP_COLORS = [
  { bg: '#C84B31', text: '#FFF' },      // 朱砂
  { bg: '#4A7C6F', text: '#FFF' },      // 石绿
  { bg: '#C9A96E', text: '#2A2520' },   // 泥金
  { bg: '#8FB8AA', text: '#2A2520' },   // 淡青
  { bg: '#B85C4F', text: '#FFF' },      // 赭红
];

const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 28;
const MIN_HEIGHT = 200;
const BORDER_RADIUS_LARGE = 4;
const BORDER_RADIUS_SMALL = 2;

const StampCloud: React.FC<StampCloudProps> = ({
  items: propItems,
  onStampClick,
}) => {
  const items = propItems || MOCK_ITEMS;
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  const getSize = useCallback((value: number) => {
    return MIN_FONT_SIZE + (value / maxValue) * (MAX_FONT_SIZE - MIN_FONT_SIZE);
  }, [maxValue]);

  const stamps = useMemo(() => {
    return items.map((item, index) => {
      const color = STAMP_COLORS[index % STAMP_COLORS.length];
      const size = getSize(item.value);
      const isLarge = item.value > maxValue * 0.6;
      return { ...item, color, size, isLarge };
    });
  }, [items, maxValue, getSize]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 12px',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      minHeight: MIN_HEIGHT,
    }}>
      {stamps.map((stamp, index) => (
        <button
          key={`${stamp.text}-${index}`}
          onClick={() => onStampClick?.(stamp.text)}
          className="animate-ink-fade"
          style={{
            fontSize: stamp.size,
            fontFamily: 'var(--font-serif)',
            fontWeight: stamp.isLarge ? 700 : 500,
            color: stamp.color.text,
            backgroundColor: stamp.color.bg,
            border: 'none',
            borderRadius: stamp.isLarge ? BORDER_RADIUS_LARGE : BORDER_RADIUS_SMALL,
            padding: `${stamp.size * 0.35}px ${stamp.size * 0.6}px`,
            cursor: onStampClick ? 'pointer' : 'default',
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            lineHeight: 1,
            letterSpacing: 1,
            opacity: 0.9,
          }}
          onMouseEnter={(e) => {
            if (onStampClick) {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${stamp.color.bg}66`;
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseDown={(e) => {
            if (onStampClick) {
              e.currentTarget.style.transform = 'scale(0.96)';
            }
          }}
          onMouseUp={(e) => {
            if (onStampClick) {
              e.currentTarget.style.transform = 'scale(1.08)';
            }
          }}
        >
          {stamp.text}
        </button>
      ))}
    </div>
  );
};

export default StampCloud;
