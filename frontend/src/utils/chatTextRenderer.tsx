import React from 'react';

const SPOT_KEYWORDS = [
  '灵山大佛', '梵宫', '九龙灌浴', '五印坛城', '曼飞龙塔',
  '天下第一掌', '百子戏弥勒', '灵山吉祥颂', '太湖观景台',
  '灵山胜境', '灵山风景区', '灵山', '太湖',
];

const PRICE_PATTERN = /(\d+元|\d+\.?\d*元|\d+元\/人|\d+元\/张|\d+元\/位)/g;
const TIME_PATTERN = /(\d{1,2}:\d{2}|\d{1,2}点|\d{1,2}:\d{2}-\d{1,2}:\d{2}|全年开放|夏季|冬季)/g;
const NUMBER_PATTERN = /(\d+\.?\d*\s*(米|公里|km|m|吨|公顷|亩|平方米|立方米))/gi;

interface TextSegment {
  type: 'text' | 'spot' | 'price' | 'time' | 'number' | 'quote';
  content: string;
}

const segmentLine = (line: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const remaining = line;

  const quoteRegex = /「([^」]+)」/g;
  let quoteMatch: RegExpExecArray | null;
  const quoteRanges: [number, number, string][] = [];
  while ((quoteMatch = quoteRegex.exec(line)) !== null) {
    quoteRanges.push([quoteMatch.index, quoteMatch.index + quoteMatch[0].length, quoteMatch[1]]);
  }

  const spotRanges: [number, number, string][] = [];
  for (const spot of SPOT_KEYWORDS) {
    let idx = remaining.indexOf(spot);
    while (idx !== -1) {
      const inQuote = quoteRanges.some(
        ([start, end]) => idx >= start && idx + spot.length <= end
      );
      if (!inQuote) {
        spotRanges.push([idx, idx + spot.length, spot]);
      }
      idx = remaining.indexOf(spot, idx + 1);
    }
  }

  const allRanges: { start: number; end: number; type: TextSegment['type']; content: string }[] = [
    ...quoteRanges.map(([s, e, c]) => ({ start: s, end: e, type: 'quote' as const, content: c })),
    ...spotRanges.map(([s, e, c]) => ({ start: s, end: e, type: 'spot' as const, content: c })),
  ];

  let m: RegExpExecArray | null;
  const priceRegex = new RegExp(PRICE_PATTERN.source, 'g');
  while ((m = priceRegex.exec(line)) !== null) {
    allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'price', content: m[0] });
  }

  const timeRegex = new RegExp(TIME_PATTERN.source, 'g');
  while ((m = timeRegex.exec(line)) !== null) {
    allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'time', content: m[0] });
  }

  const numRegex = new RegExp(NUMBER_PATTERN.source, 'gi');
  while ((m = numRegex.exec(line)) !== null) {
    const overlap = allRanges.some(
      (r) => (m!.index >= r.start && m!.index < r.end) || (m!.index + m![0].length > r.start && m!.index + m![0].length <= r.end)
    );
    if (!overlap) {
      allRanges.push({ start: m.index, end: m.index + m[0].length, type: 'number', content: m[0] });
    }
  }

  allRanges.sort((a, b) => a.start - b.start);
  const deduped: typeof allRanges = [];
  for (const r of allRanges) {
    const overlap = deduped.some(
      (d) => (r.start >= d.start && r.start < d.end) || (r.end > d.start && r.end <= d.end)
    );
    if (!overlap) deduped.push(r);
  }

  let pos = 0;
  for (const r of deduped) {
    if (r.start > pos) {
      segments.push({ type: 'text', content: remaining.slice(pos, r.start) });
    }
    segments.push({ type: r.type, content: r.content });
    pos = r.end;
  }
  if (pos < remaining.length) {
    segments.push({ type: 'text', content: remaining.slice(pos) });
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: line });
  }

  return segments;
};

const renderSegment = (seg: TextSegment, idx: number): React.ReactNode => {
  switch (seg.type) {
    case 'spot':
      return (
        <span
          key={idx}
          style={{
            color: '#4A7A68', fontWeight: 600,
            backgroundColor: 'rgba(106, 156, 137, 0.08)',
            padding: '0 4px', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          {seg.content}
        </span>
      );
    case 'price':
      return (
        <span
          key={idx}
          style={{
            color: '#C8882E', fontWeight: 600,
            backgroundColor: 'rgba(200, 136, 46, 0.08)',
            padding: '0 4px', borderRadius: '4px',
          }}
        >
          {seg.content}
        </span>
      );
    case 'time':
      return (
        <span
          key={idx}
          style={{
            color: '#2D8B57', fontWeight: 500,
            backgroundColor: 'rgba(45, 139, 87, 0.08)',
            padding: '0 4px', borderRadius: '4px',
          }}
        >
          {seg.content}
        </span>
      );
    case 'number':
      return (
        <span
          key={idx}
          style={{ color: '#8B5CF6', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
        >
          {seg.content}
        </span>
      );
    case 'quote':
      return (
        <span
          key={idx}
          style={{
            color: '#5C554C', fontStyle: 'italic',
            borderLeft: '2px solid var(--color-accent)',
            paddingLeft: '6px', marginLeft: '2px',
          }}
        >
          「{seg.content}」
        </span>
      );
    default:
      return <span key={idx}>{seg.content}</span>;
  }
};

export function renderSmartContent(content: string): React.ReactNode[] {
  if (!content) return [];

  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: { type: 'ordered' | 'unordered'; items: string[] } | null = null;
  let keyIdx = 0;

  const flushList = () => {
    if (!listBuffer || listBuffer.items.length === 0) return;
    const isOrdered = listBuffer.type === 'ordered';
    result.push(
      <ul
        key={`list-${keyIdx++}`}
        style={{
          margin: '8px 0', paddingLeft: isOrdered ? '20px' : '16px',
          listStyle: isOrdered ? 'decimal' : 'none',
        }}
      >
        {listBuffer.items.map((item, i) => (
          <li key={i} style={{ marginBottom: '6px', lineHeight: 1.7, position: 'relative', ...(isOrdered ? {} : { paddingLeft: '14px' }) }}>
            {!isOrdered && (
              <span style={{ position: 'absolute', left: 0, top: '8px', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
            )}
            {segmentLine(item).map((seg, si) => renderSegment(seg, si))}
          </li>
        ))}
      </ul>
    );
    listBuffer = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); continue; }

    const listInfo = /^\s*(\d+[\.、])\s*(.+)$/.exec(line)
      ? { type: 'ordered' as const, content: /^\s*(\d+[\.、])\s*(.+)$/.exec(line)![2] }
      : /^\s*([-\*•])\s*(.+)$/.exec(line)
        ? { type: 'unordered' as const, content: /^\s*([-\*•])\s*(.+)$/.exec(line)![2] }
        : null;

    if (listInfo) {
      if (!listBuffer) { listBuffer = { type: listInfo.type, items: [] }; }
      else if (listBuffer.type !== listInfo.type) { flushList(); listBuffer = { type: listInfo.type, items: [] }; }
      listBuffer.items.push(listInfo.content);
      continue;
    }

    flushList();
    result.push(
      <p key={`p-${keyIdx++}`} style={{ margin: '0 0 10px 0', lineHeight: 1.75, wordBreak: 'break-word' }}>
        {segmentLine(line).map((seg, si) => renderSegment(seg, si))}
      </p>
    );
  }

  flushList();
  return result;
}
