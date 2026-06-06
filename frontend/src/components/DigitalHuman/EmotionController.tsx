import { useEffect, useRef } from 'react';

export type Emotion = 'smile' | 'think' | 'sorry' | 'surprise' | 'neutral';

export interface EmotionControllerProps {
  emotion?: Emotion;
  onExpressionChange?: (expression: string) => void;
  autoReset?: boolean;
  resetDelay?: number;
}

const EMOTION_EXPRESSION_MAP: Record<Emotion, string> = {
  smile: 'happy',
  think: 'thinking',
  sorry: 'sad',
  surprise: 'surprised',
  neutral: 'default',
};

const TRANSITION_MS = 300;

const EmotionController: React.FC<EmotionControllerProps> = ({
  emotion = 'neutral',
  onExpressionChange,
  autoReset = true,
  resetDelay = 5000,
}) => {
  const prevEmotionRef = useRef<Emotion>(emotion);

  useEffect(() => {
    const expression = EMOTION_EXPRESSION_MAP[emotion] || 'default';
    const prevExpression = EMOTION_EXPRESSION_MAP[prevEmotionRef.current] || 'default';

    if (expression !== prevExpression) {
      const transitionTimer = setTimeout(() => {
        onExpressionChange?.(expression);
      }, TRANSITION_MS);
      prevEmotionRef.current = emotion;

      if (autoReset && emotion !== 'neutral') {
        const resetTimer = setTimeout(() => {
          onExpressionChange?.('default');
          prevEmotionRef.current = 'neutral';
        }, resetDelay + TRANSITION_MS);
        return () => {
          clearTimeout(transitionTimer);
          clearTimeout(resetTimer);
        };
      }
      return () => clearTimeout(transitionTimer);
    }

    onExpressionChange?.(expression);
    if (autoReset && emotion !== 'neutral') {
      const resetTimer = setTimeout(() => {
        onExpressionChange?.('default');
        prevEmotionRef.current = 'neutral';
      }, resetDelay);
      return () => clearTimeout(resetTimer);
    }
  }, [emotion, onExpressionChange, autoReset, resetDelay]);

  return null;
};

export default EmotionController;
