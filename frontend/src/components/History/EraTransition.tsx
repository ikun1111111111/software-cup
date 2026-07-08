import React, { useEffect, useRef, useCallback } from 'react';

export type Era = 'tang' | 'song' | 'ming';

interface EraTransitionProps {
  era: Era;
  isActive: boolean;
  onComplete?: () => void;
}

const DURATION = 2000;

function useSfx() {
  const poolRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    poolRef.current = {
      'paper-unroll': new Audio('/sfx/sfx-paper-unroll-v2.mp3'),
    };
    Object.values(poolRef.current).forEach((a) => a.load());
  }, []);

  const play = useCallback((name: string) => {
    const audio = poolRef.current[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  return play;
}

const EraTransition: React.FC<EraTransitionProps> = ({
  era,
  isActive,
  onComplete,
}) => {
  const playSfx = useSfx();

  useEffect(() => {
    if (!isActive) return;

    const enterTimer = setTimeout(() => playSfx('paper-unroll'), 300);
    const doneTimer = setTimeout(() => onComplete?.(), DURATION);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(doneTimer);
    };
  }, [isActive, onComplete, playSfx]);

  if (!isActive) return null;

  const lightColor =
    era === 'tang' ? '#D4A574' : era === 'song' ? '#A8C8B8' : '#E8C878';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 墨黑帘幕：纯色遮罩，最易合成 */}
      <div
        className="lens-gpu"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#030202',
          animation: `lensInk ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
        }}
      />

      {/* 暗角雾化：超大径向渐变，仅用 opacity/scale，无 blur 无 mix-blend */}
      <div
        className="lens-gpu"
        style={{
          position: 'absolute',
          inset: '-30%',
          background:
            'radial-gradient(ellipse at center, rgba(3,2,2,0.18) 0%, #030202 65%)',
          animation: `lensVignette ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
        }}
      />

      {/* 朝代色光晕：低模糊，避免大半径 filter */}
      <div
        className="lens-gpu"
        style={{
          position: 'absolute',
          inset: '-10%',
          background: `radial-gradient(ellipse at center, ${lightColor}45 0%, transparent 55%)`,
          animation: `lensBloom ${DURATION}ms ease-out forwards`,
        }}
      />

      {/* 水墨晕开：单层复合形状，用 opacity + scale 主导，blur 仅 40px */}
      <div
        className="lens-gpu"
        style={{
          position: 'absolute',
          inset: '-15%',
          background:
            'radial-gradient(ellipse 60% 50% at 28% 42%, rgba(3,2,2,0.92) 0%, transparent 55%), ' +
            'radial-gradient(ellipse 55% 60% at 72% 58%, rgba(3,2,2,0.88) 0%, transparent 55%)',
          filter: 'blur(40px)',
          animation: `lensWash ${DURATION}ms ease-in-out forwards`,
        }}
      />

      <style>{`
        .lens-gpu {
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          will-change: transform, opacity;
        }
        @keyframes lensInk {
          0%   { opacity: 0; }
          35%  { opacity: 1; }
          65%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lensVignette {
          0%   { opacity: 0; transform: scale(1.25); }
          35%  { opacity: 0.95; transform: scale(1); }
          65%  { opacity: 0.9; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        @keyframes lensBloom {
          0%   { opacity: 0; transform: scale(0.85); }
          35%  { opacity: 0.5; transform: scale(1.1); }
          65%  { opacity: 0.65; transform: scale(1.18); }
          100% { opacity: 0; transform: scale(1.28); }
        }
        @keyframes lensWash {
          0%   { opacity: 0; transform: scale(0.88); }
          30%  { opacity: 0.9; transform: scale(1.02); }
          65%  { opacity: 0.85; transform: scale(1.06); }
          100% { opacity: 0; transform: scale(1.16); }
        }
      `}</style>
    </div>
  );
};

export default EraTransition;
