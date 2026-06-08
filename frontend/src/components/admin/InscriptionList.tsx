import React from 'react';

export interface InscriptionItem {
  id: string;
  number?: number;
  text: string;
  note?: string;
  highlight?: boolean;
}

export interface InscriptionListProps {
  items: InscriptionItem[];
  onItemClick?: (item: InscriptionItem) => void;
}

const InscriptionList: React.FC<InscriptionListProps> = ({
  items,
  onItemClick,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="animate-inscription"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '10px 0',
            cursor: onItemClick ? 'pointer' : 'default',
            borderBottom: index < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            animationDelay: `${index * 50}ms`,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (onItemClick) {
              const line = e.currentTarget.querySelector('.brush-line') as HTMLElement;
              if (line) line.style.transform = 'scaleX(1)';
            }
          }}
          onMouseLeave={(e) => {
            const line = e.currentTarget.querySelector('.brush-line') as HTMLElement;
            if (line) line.style.transform = 'scaleX(0)';
          }}
        >
          {/* 序号 — 手写体 */}
          {item.number !== undefined && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              color: item.highlight ? 'var(--vermilion)' : 'var(--text-tertiary)',
              fontWeight: 600,
              minWidth: 26,
              flexShrink: 0,
            }}>
              {item.number <= 3 ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: item.highlight ? 'var(--vermilion)' : 'transparent',
                  color: item.highlight ? '#FFF' : 'var(--text-tertiary)',
                  fontSize: 12,
                  fontWeight: 700,
                  border: item.highlight ? 'none' : '1.5px solid var(--border-subtle)',
                  boxShadow: item.highlight ? '0 2px 6px rgba(200, 75, 49, 0.25)' : 'none',
                }}>
                  {item.number}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '1.5px solid var(--border-subtle)',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                }}>
                  {item.number}
                </span>
              )}
            </span>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}>
              {item.text}
            </div>
            {item.note && (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginTop: 2,
              }}>
                {item.note}
              </div>
            )}
          </div>

          {/* 朱笔圈点 hover 线 */}
          {onItemClick && (
            <span
              className="brush-line"
              style={{
                position: 'absolute',
                bottom: 6,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'var(--vermilion)',
                opacity: 0.25,
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default InscriptionList;
