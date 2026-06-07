import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 画卷卡片 — 景点/内容卡片
 * 规范文档 3.2.1 节
 */

interface ScrollCardProps {
  to?: string;
  image: string;
  title: string;
  description?: string;
  tags?: string[];
  className?: string;
  onClick?: () => void;
}

const ScrollCard: React.FC<ScrollCardProps> = ({
  to,
  image,
  title,
  description,
  tags,
  className,
  onClick,
}) => {
  const content = (
    <div
      className={`scroll-card ${className || ''}`}
      onClick={onClick}
      style={{ cursor: to || onClick ? 'pointer' : 'default' }}
    >
      <div className="scroll-card__image" style={{ aspectRatio: '3/2' }}>
        <img
          src={image}
          alt={title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      <div style={{ padding: '16px 20px 20px' }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 6,
            fontFamily: "var(--font-serif)",
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: tags?.length ? 12 : 0,
            }}
          >
            {description}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="scroll-card__footer" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span key={tag} className="badge-seal">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
};

export default ScrollCard;
