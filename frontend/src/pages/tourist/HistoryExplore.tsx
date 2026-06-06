import React, { useState } from 'react';
import { ClockCircleOutlined, BookOutlined } from '@ant-design/icons';
import TimelineView from '../../components/tourist/TimelineView';
import PuzzleGame from '../../components/tourist/PuzzleGame';
import StampWall from '../../components/tourist/StampWall';

const HistoryExplore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'puzzle' | 'stamps'>('timeline');
  const sessionId = 'web-' + Date.now().toString(36);

  const tabs = [
    { key: 'timeline' as const, label: '历史时间线', icon: <ClockCircleOutlined /> },
    { key: 'puzzle' as const, label: '文化解谜', icon: <BookOutlined /> },
    { key: 'stamps' as const, label: '印章收集', icon: <span>🔖</span> },
  ];

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
          ⏳ 时空穿越 · 历史探索
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-tertiary)' }}>
          穿越 1300 年灵山历史，从唐代到现代
        </p>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 20, fontSize: 14,
                border: activeTab === tab.key ? 'none' : '1px solid var(--border-light)',
                background: activeTab === tab.key ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'puzzle' && (
          <PuzzleGame spotName="灵山大佛" sessionId={sessionId} />
        )}
        {activeTab === 'stamps' && <StampWall sessionId={sessionId} />}
      </div>
    </div>
  );
};

export default HistoryExplore;
