import React, { useState } from 'react';
import {
  CompassOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';

export type IslandAction =
  | 'route'
  | 'history'
  | 'puzzle'
  | 'zen';

interface IslandItem {
  id: IslandAction;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const ITEMS: IslandItem[] = [
  { id: 'route', label: '路线推荐', icon: <CompassOutlined />, color: '#2D8B57' },
  { id: 'history', label: '历史探索', icon: <HistoryOutlined />, color: '#B87333' },
  { id: 'puzzle', label: '祈福拼图', icon: <AppstoreOutlined />, color: '#C84B31' },
  { id: 'zen', label: '禅意冥想', icon: <CoffeeOutlined />, color: '#6A9C89' },
];

interface GalgameLeftIslandProps {
  onAction: (action: IslandAction) => void;
  isMobile?: boolean;
}

const GalgameLeftIsland: React.FC<GalgameLeftIslandProps> = ({
  onAction,
  isMobile = false,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="animate-island-enter"
      style={{
        position: 'absolute',
        left: isMobile ? '2%' : '2.5%',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '10px' : '14px',
      }}
    >
      {ITEMS.map((item) => {
        const isHovered = hovered === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onAction(item.id)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? 40 : 46,
              height: isMobile ? 40 : 46,
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              background: isHovered
                ? `${item.color}30`
                : 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(10px) saturate(130%)',
              WebkitBackdropFilter: 'blur(10px) saturate(130%)',
              color: isHovered ? item.color : '#2A2520',
              fontSize: isMobile ? '16px' : '18px',
              cursor: 'pointer',
              transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHovered
                ? `0 4px 16px ${item.color}40`
                : '0 2px 8px rgba(42, 37, 32, 0.08)',
              flexShrink: 0,
            }}
          >
            {item.icon}
            <span
              style={{
                position: 'absolute',
                left: isMobile ? 46 : 54,
                top: '50%',
                transform: isHovered ? 'translateY(-50%) translateX(6px)' : 'translateY(-50%) translateX(0)',
                opacity: isHovered ? 1 : 0,
                whiteSpace: 'nowrap',
                padding: '5px 12px',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#2A2520',
                fontSize: '12px',
                fontWeight: 600,
                pointerEvents: 'none',
                transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 10px rgba(42, 37, 32, 0.08)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      <style>{`
        .animate-island-enter {
          animation: islandEnter 500ms cubic-bezier(0.22, 1, 0.36, 1) 600ms both;
        }
        @keyframes islandEnter {
          from { opacity: 0; transform: translateY(-50%) translateX(-20px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default GalgameLeftIsland;
