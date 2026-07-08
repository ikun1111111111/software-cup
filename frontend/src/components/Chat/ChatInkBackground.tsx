import React, { useEffect, useRef } from 'react';

/* ================================================================
   ChatInkBackground — 水墨意境背景层
   为对话页面营造灵山胜境的沉浸式氛围
   ================================================================ */

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  type: 'petal' | 'leaf' | 'mist';
  rotation: number;
  rotationSpeed: number;
}

const ChatInkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 初始化粒子
    const initParticles = () => {
      const particles: Particle[] = [];
      const count = Math.min(25, Math.floor(window.innerWidth / 60));
      for (let i = 0; i < count; i++) {
        particles.push(createParticle());
      }
      particlesRef.current = particles;
    };

    const createParticle = (): Particle => {
      const types: Particle['type'][] = ['petal', 'leaf', 'mist'];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.4 + 0.1,
        type: types[Math.floor(Math.random() * types.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      };
    };

    initParticles();

    const drawMountain = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      // 远山轮廓 —— 淡墨
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#2A2520';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.68 + Math.sin(x * 0.003 + time * 0.0002) * 30 + Math.sin(x * 0.008) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 近山轮廓 —— 稍浓
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#3D3832';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.78);
      for (let x = 0; x <= w; x += 6) {
        const y = h * 0.75 + Math.sin(x * 0.005 + time * 0.0003 + 1) * 20 + Math.sin(x * 0.012) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawParticles = (time: number) => {
      const particles = particlesRef.current;
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.opacity * (0.5 + Math.sin(time * 0.001 + p.x) * 0.3);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation + time * p.rotationSpeed);

        if (p.type === 'petal') {
          // 花瓣
          ctx.fillStyle = 'rgba(200, 160, 160, 0.6)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'leaf') {
          // 柳叶
          ctx.fillStyle = 'rgba(140, 160, 130, 0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 薄雾点
          ctx.fillStyle = 'rgba(180, 170, 160, 0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // 更新位置
        p.x += p.speedX + Math.sin(time * 0.0005 + p.y * 0.01) * 0.2;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        // 边界重置
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
      }
    };

    const drawInkWash = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      // 左上角淡墨晕染
      ctx.save();
      const gradient1 = ctx.createRadialGradient(w * 0.15, h * 0.2, 0, w * 0.15, h * 0.2, w * 0.35);
      gradient1.addColorStop(0, 'rgba(42, 37, 32, 0.025)');
      gradient1.addColorStop(1, 'rgba(42, 37, 32, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, w * 0.5, h * 0.5);
      ctx.restore();

      // 右下角淡墨晕染
      ctx.save();
      const gradient2 = ctx.createRadialGradient(w * 0.85, h * 0.8, 0, w * 0.85, h * 0.8, w * 0.3);
      gradient2.addColorStop(0, 'rgba(60, 50, 40, 0.02)');
      gradient2.addColorStop(1, 'rgba(60, 50, 40, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(w * 0.5, h * 0.5, w * 0.5, h * 0.5);
      ctx.restore();

      // 水波纹 —— 底部
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#6A9C89';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const baseY = h * 0.88 + i * 18;
        for (let x = 0; x <= w; x += 4) {
          const y = baseY + Math.sin(x * 0.015 + time * 0.001 + i * 0.8) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawInkWash(time);
      drawMountain(time);
      drawParticles(time);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ChatInkBackground;
