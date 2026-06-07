import React, { useEffect, useRef } from 'react';

/**
 * 飘落粒子系统 — 花瓣 + 银杏叶
 * 用于全站背景装饰，营造东方美学氛围
 */

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: 'petal' | 'leaf';
}

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 25,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 2 - h,
      size: 4 + Math.random() * 8,
      speedY: 0.2 + Math.random() * 0.4,
      speedX: (Math.random() - 0.5) * 0.3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.2,
      opacity: 0.15 + Math.random() * 0.25,
      type: Math.random() > 0.5 ? 'petal' : 'leaf',
    }));

    let animId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.003) * 0.15;
        p.rotation += p.rotationSpeed;

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;

        if (p.type === 'petal') {
          ctx.fillStyle = '#D4A5A5';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#C8A951';
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(p.size * 0.6, -p.size * 0.3, p.size * 0.3, p.size * 0.5);
          ctx.quadraticCurveTo(0, p.size * 0.8, -p.size * 0.3, p.size * 0.5);
          ctx.quadraticCurveTo(-p.size * 0.6, -p.size * 0.3, 0, -p.size);
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default FloatingParticles;
