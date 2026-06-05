import { useState, useEffect, useRef } from 'react';

/**
 * 毛笔书写效果 Hook
 * 追踪文本变化，为新增字符添加"墨迹"高亮效果
 *
 * @param text 原始文本
 * @param enabled 是否启用书写效果
 * @returns 处理后的 React 节点
 */
export function useBrushWrite(text: string, enabled: boolean) {
  const [rendered, setRendered] = useState<React.ReactNode>(text);
  const prevLenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || !text) {
      setRendered(text);
      prevLenRef.current = text.length;
      return;
    }

    const prevLen = prevLenRef.current;
    const newLen = text.length;

    if (newLen <= prevLen) {
      // 文本被替换（如 faq_hit），直接显示
      setRendered(text);
      prevLenRef.current = newLen;
      return;
    }

    // 旧文本 + 新字符（带高亮）
    const oldText = text.slice(0, prevLen);
    const newText = text.slice(prevLen);

    setRendered(
      <>
        {oldText}
        <span
          style={{
            animation: 'brushGlow 600ms ease-out both',
            display: 'inline',
          }}
        >
          {newText}
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: 'linear-gradient(180deg, #2A2520, #C8882E)',
            marginLeft: 1,
            verticalAlign: 'text-bottom',
            animation: 'inkCursor 1s ease-in-out infinite',
          }}
        />
      </>
    );

    prevLenRef.current = newLen;

    // 文本完成后移除光标
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setRendered(text);
    }, 800);

    return () => clearTimeout(timerRef.current);
  }, [text, enabled]);

  return rendered;
}
