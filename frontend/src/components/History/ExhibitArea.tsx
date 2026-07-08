import React from 'react';
import type { Exhibit } from '../../data/types';

interface ExhibitAreaProps {
  exhibit: Exhibit | undefined;
  segmentText: string;
}

const ExhibitArea: React.FC<ExhibitAreaProps> = ({ exhibit, segmentText }) => {
  if (!exhibit) return null;

  const assetPath = `/image/history/${exhibit.asset}`;

  return (
    <div
      key={`${exhibit.asset}-${exhibit.animation}`}
      style={{
        width: '100%',
        height: 220,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 14,
        border: '1px solid rgba(180, 160, 130, 0.2)',
        animation: 'exhibitFadeIn 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'opacity, transform',
      }}
    >
      {/* 底图 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${assetPath}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* 书法/文字叠加层 */}
      {exhibit.type === 'calligraphy' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              writingMode: 'vertical-rl',
              fontFamily: "'KaiTi','STKaiti',serif",
              fontSize: 22,
              color: '#2A2520',
              lineHeight: 1.8,
              letterSpacing: 6,
              textShadow: '0 1px 2px rgba(248,246,242,0.8)',
              animation: 'brushWriteIn 800ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards',
              opacity: 0,
            }}
          >
            {segmentText}
          </div>
        </div>
      )}

      {/* 图注 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 12px',
          background: 'linear-gradient(to top, rgba(20,18,16,0.55), transparent)',
          fontSize: 11,
          color: '#F5F0E8',
          fontFamily: "'KaiTi','STKaiti',serif",
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        {exhibit.caption}
      </div>

      <style>{`
        @keyframes exhibitFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes brushWriteIn {
          from { opacity: 0; transform: translateY(8px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
};

export default ExhibitArea;
