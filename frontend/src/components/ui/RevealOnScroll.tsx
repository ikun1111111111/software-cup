import React, { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 滚动浮现容器
 * 元素进入视口时触发淡入上浮动画
 * 规范文档 5.5 节：元素浮现
 */

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delay = 0,
  className,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 600ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms, transform 600ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default RevealOnScroll;
