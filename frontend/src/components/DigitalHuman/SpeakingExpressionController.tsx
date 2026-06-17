import { useEffect, useRef, useCallback } from 'react';

export interface ExpressionKeyframe {
  /** Time offset in seconds from speech start */
  time: number;
  /** Expression name: neutral, happy, relaxed, surprised, sad, angry */
  expression: string;
  /** Duration to hold this expression before next transition */
  duration: number;
}

export interface SpeakingExpressionProps {
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Current audio time in seconds */
  audioTimeSec: number;
  /** Total audio duration in seconds */
  audioDurationSec: number;
  /** Text being spoken (for sentiment analysis) */
  text?: string;
  /** Callback when expression changes */
  onExpressionChange: (expression: string) => void;
}

/**
 * Generate a natural expression sequence based on text sentiment and duration.
 * Uses keyword matching to determine the emotional tone.
 */
function generateExpressionSequence(
  text: string,
  durationSec: number
): ExpressionKeyframe[] {
  const sequence: ExpressionKeyframe[] = [];
  const sentiment = analyzeSentiment(text);

  // Base expression depends on sentiment
  const baseExpression = sentiment.base;
  const accentExpressions = sentiment.accents;

  // Start with neutral
  sequence.push({ time: 0, expression: 'neutral', duration: 0.8 });

  // Transition to base expression
  if (baseExpression !== 'neutral' && durationSec > 1.5) {
    sequence.push({ time: 0.8, expression: baseExpression, duration: 0 });
  }

  // Add accent expressions at natural intervals
  if (durationSec > 3 && accentExpressions.length > 0) {
    const interval = Math.max(2, durationSec / (accentExpressions.length + 1));
    accentExpressions.forEach((expr, i) => {
      const time = 0.8 + interval * (i + 1);
      if (time < durationSec - 1) {
        sequence.push({ time, expression: expr, duration: 1.2 });
      }
    });
  }

  // Return to neutral near the end
  if (durationSec > 2) {
    sequence.push({
      time: Math.max(0, durationSec - 0.8),
      expression: 'neutral',
      duration: 0,
    });
  }

  return sequence;
}

/**
 * Simple keyword-based sentiment analysis for Chinese text.
 */
function analyzeSentiment(text: string): {
  base: string;
  accents: string[];
} {
  const lower = text.toLowerCase();

  // Happy/positive keywords
  const happyWords = ['欢迎', '你好', '开心', '高兴', '美好', '精彩', '棒', '赞', '恭喜', '快乐', '幸福', '推荐', '美', '漂亮', '圣地', '值得一'];
  // Surprised keywords
  const surpriseWords = ['哇', '惊讶', '没想到', '竟然', '居然', '惊奇', '不可思议', '大佛', '宏伟', '壮观', '高达', '世界第一', '震撼', '88米', '举世闻名'];
  // Sad/nostalgic keywords
  const sadWords = ['遗憾', '可惜', '悲伤', '离别', '怀念', '思念', '可惜', '毁坏', '消失', '沧桑', '历经'];
  // Thinking/serious keywords
  const thinkWords = ['思考', '考虑', '历史', '文化', '传统', '由来', '原因', '因为', '所以', '故事', '传说', '佛教', '禅', '古老', '千年', '含义'];

  const hasHappy = happyWords.some(w => lower.includes(w));
  const hasSurprise = surpriseWords.some(w => lower.includes(w));
  const hasSad = sadWords.some(w => lower.includes(w));
  const hasThink = thinkWords.some(w => lower.includes(w));

  if (hasSurprise) {
    return { base: 'surprised', accents: ['happy', 'neutral'] };
  }
  if (hasSad) {
    return { base: 'relaxed', accents: ['neutral', 'relaxed'] };
  }
  if (hasThink) {
    return { base: 'neutral', accents: ['relaxed', 'neutral'] };
  }
  if (hasHappy) {
    return { base: 'neutral', accents: ['neutral', 'happy'] };
  }

  // Default: calm neutral guide
  return { base: 'neutral', accents: ['neutral', 'relaxed', 'neutral'] };
}

const SpeakingExpressionController: React.FC<SpeakingExpressionProps> = ({
  isSpeaking,
  audioTimeSec,
  audioDurationSec,
  text = '',
  onExpressionChange,
}) => {
  const sequenceRef = useRef<ExpressionKeyframe[]>([]);
  const lastExpressionRef = useRef<string>('neutral');
  const lastTextRef = useRef<string>('');

  // Regenerate sequence when text changes
  useEffect(() => {
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      if (text) {
        const duration = audioDurationSec > 0
          ? audioDurationSec
          : Math.max(2, text.length / 4);
        sequenceRef.current = generateExpressionSequence(text, duration);
      }
    }
  }, [text, audioDurationSec]);

  // Reset when not speaking
  useEffect(() => {
    if (!isSpeaking) {
      if (lastExpressionRef.current !== 'neutral') {
        lastExpressionRef.current = 'neutral';
        onExpressionChange('neutral');
      }
      sequenceRef.current = [];
    }
  }, [isSpeaking, onExpressionChange]);

  // Apply expression based on current audio time
  useEffect(() => {
    if (!isSpeaking || sequenceRef.current.length === 0) return;

    const sequence = sequenceRef.current;
    let currentExpr = 'neutral';

    for (let i = sequence.length - 1; i >= 0; i--) {
      if (audioTimeSec >= sequence[i].time) {
        currentExpr = sequence[i].expression;
        break;
      }
    }

    if (currentExpr !== lastExpressionRef.current) {
      lastExpressionRef.current = currentExpr;
      onExpressionChange(currentExpr);
    }
  }, [isSpeaking, audioTimeSec, onExpressionChange]);

  return null;
};

export default SpeakingExpressionController;
