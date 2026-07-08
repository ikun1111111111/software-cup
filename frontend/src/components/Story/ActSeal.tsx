import React, { useEffect, useState } from 'react';
import type { Emotion } from '../DigitalHuman/EmotionController';

const SEAL_SRC: Record<Emotion, string> = {
  think: '/image/story/seal-think.png',
  surprise: '/image/story/seal-surprise.png',
  smile: '/image/story/seal-smile.png',
  neutral: '/image/story/seal-neutral.png',
  sorry: '/image/story/seal-neutral.png',
};

interface Props {
  emotion: Emotion;
  actKey: string;
}

const ActSeal: React.FC<Props> = ({ emotion, actKey }) => {
  const [visible, setVisible] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    setVisible(false);
    const enter = window.setTimeout(() => setVisible(true), 60);
    const exit = window.setTimeout(() => setVisible(false), 1900);
    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
    };
  }, [actKey]);

  if (errored) return null;

  return (
    <>
      <style>{`
        @keyframes storySealPress {
          0%   { opacity: 0; transform: scale(1.35) rotate(-8deg); filter: blur(4px); }
          55%  { opacity: 1; transform: scale(0.92) rotate(-3deg); filter: blur(0); }
          75%  { opacity: 1; transform: scale(1.02) rotate(-4deg); }
          100% { opacity: 1; transform: scale(1) rotate(-4deg); }
        }
        @keyframes storySealExit {
          from { opacity: 1; transform: scale(1) rotate(-4deg); }
          to   { opacity: 0; transform: scale(0.92) rotate(-4deg); filter: blur(2px); }
        }
      `}</style>
      <img
        key={actKey}
        src={SEAL_SRC[emotion]}
        onError={() => setErrored(true)}
        alt=""
        style={{
          position: 'absolute',
          top: 92,
          left: 64,
          width: 96,
          height: 96,
          zIndex: 40,
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
          opacity: 0,
          animation: visible
            ? `storySealPress 520ms cubic-bezier(0.2,0.8,0.2,1) 0ms forwards`
            : `storySealExit 460ms ease-in 0ms forwards`,
          filter: 'drop-shadow(0 2px 6px rgba(80,20,10,0.35))',
        }}
      />
    </>
  );
};

export default ActSeal;
