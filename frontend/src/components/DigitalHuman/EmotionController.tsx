import { useEffect } from 'react';

export type Emotion = 'positive' | 'negative' | 'neutral' | 'surprised' | 'thinking';

export interface EmotionControllerProps {
  emotion?: Emotion;
  onExpressionChange?: (expression: string) => void;
  autoReset?: boolean;
  resetDelay?: number;
}

const EMOTION_EXPRESSION_MAP: Record<Emotion, string> = {
  positive: 'happy',
  negative: 'sad',
  neutral: 'default',
  surprised: 'surprised',
  thinking: 'thinking',
};

const EmotionController: React.FC<EmotionControllerProps> = ({
  emotion = 'neutral',
  onExpressionChange,
  autoReset = true,
  resetDelay = 4000,
}) => {
  useEffect(() => {
    const expression = EMOTION_EXPRESSION_MAP[emotion] || 'default';
    onExpressionChange?.(expression);

    if (autoReset && emotion !== 'neutral') {
      const timer = setTimeout(() => {
        onExpressionChange?.('default');
      }, resetDelay);
      return () => clearTimeout(timer);
    }
  }, [emotion, onExpressionChange, autoReset, resetDelay]);

  // This component is logic-only, renders nothing visible
  return null;
};

export default EmotionController;
