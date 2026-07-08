import React, { useMemo } from 'react';
import type { ThemeCard } from '../../types/themeCards';
import FoodMapCard from './FoodMapCard';
import RouteMapCard from './RouteMapCard';
import SpotInfoCard from './SpotInfoCard';
import TicketInfoCard from './TicketInfoCard';
import HistoryTimelineCard from './HistoryTimelineCard';
import CultureImageCard from './CultureImageCard';

interface Props {
  card: ThemeCard | null;
  topic?: string | null;
}

const ThemeCardContainer: React.FC<Props> = ({ card, topic }) => {
  const key = useMemo(() => (card ? `${card.type}_${Date.now()}` : 'empty'), [card]);

  if (!card) {
    return (
      <div
        style={{
          padding: '28px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-light)',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>{topic ? '⛰️' : '👋'}</div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {topic ? `正在准备「${topic}」主题内容...` : '等待主题内容...'}
        </div>
        <div style={{ fontSize: 13 }}>
          {topic ? '数字导游正在整理相关信息' : '点击左侧场景或直接对话，即可查看导览卡片'}
        </div>
      </div>
    );
  }

  let content: React.ReactNode;
  switch (card.type) {
    case 'food_map':
      content = <FoodMapCard card={card} />;
      break;
    case 'route_map':
      content = <RouteMapCard card={card} />;
      break;
    case 'spot_info':
      content = <SpotInfoCard card={card} />;
      break;
    case 'ticket_info':
      content = <TicketInfoCard card={card} />;
      break;
    case 'timeline':
      content = <HistoryTimelineCard card={card} />;
      break;
    case 'culture_image':
      content = <CultureImageCard card={card} />;
      break;
    default:
      content = (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
          未知卡片类型：{(card as any).type}
        </div>
      );
  }

  return (
    <div
      key={key}
      style={{
        width: '100%',
        minHeight: 0,
        padding: 18,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        animation: 'fadeInUp 350ms var(--ease-out-expo) both',
      }}
    >
      {content}
    </div>
  );
};

export default ThemeCardContainer;
