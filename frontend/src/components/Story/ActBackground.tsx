import React, { useEffect, useRef, useState } from 'react';
import type { Emotion } from '../DigitalHuman/EmotionController';

type Layer = { emotion: Emotion; actId: string; imageUrl?: string } | null;

const PALETTES: Record<Emotion, { base: string; glow: string; ink: string }> = {
  think:    { base: 'linear-gradient(180deg,#2a3340 0%,#475566 55%,#6a7989 100%)', glow: 'radial-gradient(60% 50% at 30% 35%,rgba(140,170,200,0.45),transparent 70%)', ink: 'rgba(180,200,220,0.18)' },
  surprise: { base: 'linear-gradient(180deg,#3a2a14 0%,#6b4a1e 50%,#a8762e 100%)', glow: 'radial-gradient(55% 45% at 50% 30%,rgba(255,210,120,0.55),transparent 72%)', ink: 'rgba(255,220,150,0.22)' },
  smile:    { base: 'linear-gradient(180deg,#1d3026 0%,#3a5a44 55%,#6a9a6f 100%)', glow: 'radial-gradient(60% 50% at 35% 30%,rgba(180,230,160,0.45),transparent 70%)', ink: 'rgba(200,230,180,0.20)' },
  sorry:    { base: 'linear-gradient(180deg,#2a2030 0%,#3d3050 55%,#5a4a72 100%)', glow: 'radial-gradient(55% 45% at 45% 30%,rgba(180,150,210,0.35),transparent 72%)', ink: 'rgba(200,170,220,0.18)' },
  neutral:  { base: 'linear-gradient(180deg,#d8d2c4 0%,#c2bba9 60%,#a89f8a 100%)', glow: 'radial-gradient(60% 50% at 35% 35%,rgba(255,250,230,0.55),transparent 70%)', ink: 'rgba(80,68,52,0.16)' },
};

const NOISE_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")";

const Layer: React.FC<{ layer: NonNullable<Layer>; visible: boolean }> = ({ layer, visible }) => {
  const pal = PALETTES[layer.emotion] || PALETTES.neutral;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!layer.imageUrl) return;
    setImgLoaded(false);
    setImgError(false);
    const img = new Image();
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgError(true);
    img.src = layer.imageUrl;
  }, [layer.imageUrl]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: pal.base,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease-in-out',
        willChange: 'opacity',
      }}
    >
      {/* 图片层 — 加载后淡入 */}
      {layer.imageUrl && !imgError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${layer.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 800ms ease-in-out',
            willChange: 'opacity',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: pal.glow }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: NOISE_URI,
          backgroundBlendMode: 'overlay',
          opacity: 0.5,
          mixBlendMode: 'soft-light',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, transparent 0%, ${pal.ink} 60%, ${pal.ink} 100%)`,
        }}
      />
    </div>
  );
};

const ActBackground: React.FC<{ emotion: Emotion; actId: string; imageUrl?: string }> = ({ emotion, actId, imageUrl }) => {
  const [layerA, setLayerA] = useState<Layer>({ emotion, actId, imageUrl });
  const [layerB, setLayerB] = useState<Layer>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  const prevKey = useRef(`${layerA?.actId}-${layerA?.imageUrl}`);

  useEffect(() => {
    const next = { emotion, actId, imageUrl };
    const key = `${actId}-${imageUrl}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (activeLayer === 'A') {
      setLayerB(next);
      const t = setTimeout(() => setActiveLayer('B'), 20);
      return () => clearTimeout(t);
    } else {
      setLayerA(next);
      const t = setTimeout(() => setActiveLayer('A'), 20);
      return () => clearTimeout(t);
    }
  }, [emotion, actId, imageUrl, activeLayer]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {layerA && <Layer layer={layerA} visible={activeLayer === 'A'} />}
      {layerB && <Layer layer={layerB} visible={activeLayer === 'B'} />}
    </div>
  );
};

export default ActBackground;
