import { useCallback, useEffect, useRef } from 'react';

export interface LipSyncProps {
  audioData?: Float32Array | null;
  onParameterChange?: (paramId: string, value: number) => void;
  smoothing?: number;
  enabled?: boolean;
}

// Live2D Cubism 4 mouth parameters
const PARAM_MOUTH_OPEN_Y = 'ParamMouthOpenY';
const PARAM_MOUTH_FORM = 'ParamMouthForm';

const LipSync: React.FC<LipSyncProps> = ({
  audioData,
  onParameterChange,
  smoothing = 0.4,
  enabled = true,
}) => {
  const prevValueRef = useRef(0);

  const processAudioData = useCallback((data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    const normalized = Math.min(1, rms * 8);

    // Smoothing for natural movement
    const smoothed = prevValueRef.current * smoothing + normalized * (1 - smoothing);
    prevValueRef.current = smoothed;
    return smoothed;
  }, [smoothing]);

  useEffect(() => {
    if (!enabled || !audioData) {
      // Close mouth when no audio
      prevValueRef.current *= 0.7; // Decay
      onParameterChange?.(PARAM_MOUTH_OPEN_Y, prevValueRef.current);
      if (prevValueRef.current < 0.01) {
        onParameterChange?.(PARAM_MOUTH_OPEN_Y, 0);
      }
      return;
    }

    const value = processAudioData(audioData);
    onParameterChange?.(PARAM_MOUTH_OPEN_Y, value);
    // Slight mouth form variation for more natural look
    onParameterChange?.(PARAM_MOUTH_FORM, value * 0.3);
  }, [audioData, processAudioData, onParameterChange, enabled]);

  // Logic-only component
  return null;
};

export default LipSync;
