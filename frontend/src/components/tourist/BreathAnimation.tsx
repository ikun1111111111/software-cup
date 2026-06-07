import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  script: string;
  duration?: number;
  onComplete?: () => void;
}

const BreathAnimation: React.FC<Props> = ({ script, duration = 180, onComplete }) => {
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const cycleDuration = 19; // 4 inhale + 7 hold + 8 exhale

  const startBreathing = useCallback(() => {
    setPhase('inhale');
    setSeconds(0);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        const cyclePos = next % cycleDuration;
        if (cyclePos < 4) setPhase('inhale');
        else if (cyclePos < 11) setPhase('hold');
        else setPhase('exhale');
        return next;
      });
      setElapsed((e) => {
        if (e + 1 >= duration) {
          setPhase('done');
          clearInterval(timerRef.current);
          onComplete?.();
          return e + 1;
        }
        return e + 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, duration, onComplete]);

  const phaseLabels: Record<string, string> = {
    idle: '准备开始',
    inhale: '吸气...',
    hold: '屏息...',
    exhale: '呼气...',
    done: '冥想结束 🧘',
  };

  const phaseColors: Record<string, string> = {
    idle: '#94A3B8',
    inhale: '#3B82F6',
    hold: '#8B5CF6',
    exhale: '#22C55E',
    done: '#059669',
  };

  const scale = phase === 'inhale' ? 1.3 : phase === 'hold' ? 1.3 : phase === 'exhale' ? 0.8 : 1;
  const progress = Math.min((elapsed / duration) * 100, 100);

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {/* Breathing circle */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%', margin: '0 auto 24px',
        background: `radial-gradient(circle, ${phaseColors[phase]}40 0%, ${phaseColors[phase]}10 70%)`,
        border: `3px solid ${phaseColors[phase]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        transform: `scale(${scale})`,
        transition: 'transform 2s ease-in-out, border-color 500ms',
        boxShadow: `0 0 40px ${phaseColors[phase]}30`,
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: phaseColors[phase] }}>
          {phase === 'idle' || phase === 'done' ? '' : Math.abs(cycleDuration - (seconds % cycleDuration))}
        </div>
        <div style={{ fontSize: 15, color: phaseColors[phase], fontWeight: 600 }}>
          {phaseLabels[phase]}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '80%', maxWidth: 300, height: 4, borderRadius: 2,
        background: 'rgba(0,0,0,0.06)', margin: '0 auto 12px',
      }}>
        <div style={{
          width: `${progress}%`, height: '100%', borderRadius: 2,
          background: phaseColors[phase], transition: 'width 1s linear',
        }} />
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
      </div>

      {/* Script text */}
      <div style={{
        maxWidth: 500, margin: '0 auto', fontSize: 15, lineHeight: 2,
        color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
        padding: '16px 24px', background: 'rgba(255,255,255,0.5)',
        borderRadius: 12, textAlign: 'left',
      }}>
        {script}
      </div>

      {phase === 'idle' && (
        <button
          onClick={startBreathing}
          style={{
            marginTop: 20, padding: '12px 32px', borderRadius: 24,
            background: 'linear-gradient(135deg, #059669, #34D399)',
            color: '#fff', border: 'none', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
          }}
        >
          🧘 开始冥想
        </button>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 16, fontSize: 16, color: '#059669', fontWeight: 600 }}>
          愿你带着这份宁静继续旅程 🌸
        </div>
      )}
    </div>
  );
};

export default BreathAnimation;
