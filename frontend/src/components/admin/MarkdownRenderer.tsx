import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: string[] = [];
  let listOrdered = false;

  const flushList = () => {
    if (listItems.length === 0) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        style={{
          margin: '0 0 12px 0',
          paddingLeft: '20px',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: 1.7,
        }}
      >
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listOrdered = false;
  };

  const renderInline = (text: string): React.ReactNode => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      elements.push(
        <hr
          key={`hr-${elements.length}`}
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-ink)',
            margin: '16px 0',
          }}
        />
      );
      i++;
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = ['20px', '18px', '16px', '15px', '14px', '14px'];
      const weights = [700, 700, 600, 600, 600, 600];
      const HTag = `h${level + 1}` as keyof JSX.IntrinsicElements;
      elements.push(
        <div
          key={`h-${elements.length}`}
          style={{
            margin: '16px 0 8px 0',
            fontSize: sizes[level - 1],
            fontWeight: weights[level - 1],
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          {renderInline(headingMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (listOrdered) flushList();
      listItems.push(trimmed.slice(2));
      i++;
      continue;
    }

    // Ordered list
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!listOrdered && listItems.length > 0) flushList();
      listOrdered = true;
      listItems.push(orderedMatch[2]);
      i++;
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p
        key={`p-${elements.length}`}
        style={{
          margin: '0 0 10px 0',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: 1.7,
        }}
      >
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  flushList();

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {elements}
    </div>
  );
};

export default MarkdownRenderer;
