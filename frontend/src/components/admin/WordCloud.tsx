import React, { useCallback } from 'react';
import { CloudOutlined } from '@ant-design/icons';

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface WordCloudProps {
  words?: WordCloudItem[];
  onWordClick?: (word: string) => void;
}

const MOCK_WORDS: WordCloudItem[] = [
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

const COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-accent)',
  'var(--color-error)',
  '#8B5CF6',
  '#13c2c2',
  '#C23B22',
  '#0D7377',
];

const WordCloud: React.FC<WordCloudProps> = ({
  words: propWords,
  onWordClick,
}) => {
  const words = propWords || MOCK_WORDS;
  const maxValue = Math.max(...words.map((w) => w.value));

  const getFontSize = useCallback((value: number) => {
    const minSize = 14;
    const maxSize = 36;
    return minSize + ((value / maxValue) * (maxSize - minSize));
  }, [maxValue]);

  const getColor = useCallback((index: number) => {
    return COLORS[index % COLORS.length];
  }, []);

  return (
    <div data-testid="word-cloud" style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 18px 0',
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <CloudOutlined style={{ color: 'var(--color-primary)' }} />
        关注点词云
      </h3>
      <div
        data-testid="cloud-container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '28px',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          minHeight: '200px',
          backgroundColor: 'var(--surface-elevated)',
        }}
      >
        {words.map((word, index) => (
          <span
            key={word.text}
            data-testid={`word-${word.text}`}
            onClick={() => onWordClick?.(word.text)}
            style={{
              fontSize: `${getFontSize(word.value)}px`,
              color: getColor(index),
              cursor: onWordClick ? 'pointer' : 'default',
              fontWeight: word.value > 50 ? 700 : 400,
              padding: '4px 8px',
              transition: 'opacity 200ms',
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default WordCloud;
