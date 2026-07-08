import type { Emotion } from '../components/DigitalHuman/EmotionController';

const SMILE_RE = /[开心高兴棒好赞喜欢满意]/;
const SORRY_RE = /[抱歉遗憾难过不幸问题错]/;
const THINK_RE = /[？?什么为什么怎么]/;
const SURPRISE_RE = /[！!哇厉害惊讶]/;

export function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (SMILE_RE.test(text)) return 'smile';
  if (SORRY_RE.test(text)) return 'sorry';
  if (THINK_RE.test(text)) return 'think';
  if (SURPRISE_RE.test(text)) return 'surprise';
  return 'neutral';
}

export function motionForEmotion(emotion: Emotion): string | null {
  const map: Record<Emotion, string | null> = {
    smile: 'TapBody',
    think: 'TapHead',
    sorry: 'Tap',
    surprise: 'TapBody',
    neutral: null,
  };
  return map[emotion] ?? null;
}
