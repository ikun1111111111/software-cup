import React, { useCallback, useRef, useState } from 'react';
import Live2DStage, { Live2DModelActions } from './Live2DStage';
import EmotionController, { Emotion } from './EmotionController';
import LipSync, { type Phoneme } from './LipSync';
import AudioSync from './AudioSync';
import { useIdleAnimation } from '../../hooks/useIdleAnimation';

export interface DigitalHumanProps {
  modelPath?: string;
  width?: number;
  height?: number;
  emotion?: Emotion;
  /** Direct Live2D expression name (e.g. 'f00', 'f01'). Takes precedence over emotion when set. */
  expression?: string | null;
  audioUrl?: string;
  /** Streaming audio chunks as base64 (from TTS SSE). */
  audioChunks?: string[];
  /** Phoneme timestamps for lip-sync. */
  phonemes?: Phoneme[] | null;
  isSpeaking?: boolean;
  onReady?: () => void;
}

const DEFAULT_MODEL = '/models/haru/haru_greeter_t03.model3.json';

const DigitalHuman: React.FC<DigitalHumanProps> = ({
  modelPath = DEFAULT_MODEL,
  width = 280,
  height = 380,
  emotion = 'neutral',
  expression,
  audioUrl,
  audioChunks,
  phonemes,
  isSpeaking = false,
  onReady,
}) => {
  const actionsRef = useRef<Live2DModelActions | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [mouthValue, setMouthValue] = useState(0);

  // Idle animations (blinking + breathing)
  const setParam = useCallback((id: string, value: number) => {
    actionsRef.current?.setParameter(id, value);
  }, []);

  useIdleAnimation(setParam, { enabled: !isSpeaking });

  // Handle model loaded
  const handleModelLoaded = useCallback((model: any) => {
    onReady?.();
  }, [onReady]);

  // Store model actions from Live2DStage
  const handleModelRef = useCallback((actions: Live2DModelActions) => {
    actionsRef.current = actions;
  }, []);

  // Direct expression control
  React.useEffect(() => {
    if (expression && actionsRef.current) {
      actionsRef.current.setExpression(expression);
    }
  }, [expression]);

  // Expression change from EmotionController
  const handleExpressionChange = useCallback((expression: string) => {
    actionsRef.current?.setExpression(expression);
  }, []);

  // Lip sync parameter change — also track mouth value for debugging
  const handleLipParamChange = useCallback((paramId: string, value: number) => {
    actionsRef.current?.setParameter(paramId, value);
    if (paramId === 'ParamMouthOpenY') {
      setMouthValue(value);
    }
  }, []);

  // Update current time in ms for phoneme matching
  const handleTimeUpdateMs = useCallback((ms: number) => {
    setCurrentTimeMs(ms);
  }, []);

  // Fallback audio data generation when no phonemes available
  React.useEffect(() => {
    if (isSpeaking && !phonemes?.length) {
      const interval = setInterval(() => {
        const simulated = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          simulated[i] = (Math.random() * 0.5 + 0.2) * Math.sin(Date.now() / 100);
        }
        setAudioData(simulated);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setAudioData(null);
    }
  }, [isSpeaking, phonemes]);

  return (
    <div
      data-testid="digital-human"
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #F0F4FF 0%, #E8F0FE 50%, #F8F6F2 100%)',
      }}
    >
      {/* Live2D Model */}
      <Live2DStage
        modelPath={modelPath}
        width={width}
        height={height}
        scale={0.18}
        onModelLoaded={handleModelLoaded}
        onModelRef={handleModelRef}
      />

      {/* Emotion Controller */}
      <EmotionController
        emotion={expression ? 'neutral' : emotion}
        onExpressionChange={expression ? undefined : handleExpressionChange}
        autoReset={!expression}
        resetDelay={5000}
      />

      {/* Lip Sync */}
      <LipSync
        audioData={audioData}
        phonemes={phonemes}
        currentTimeMs={currentTimeMs}
        onParameterChange={handleLipParamChange}
        enabled={isSpeaking}
      />

      {/* Audio Sync */}
      <AudioSync
        audioUrl={audioUrl}
        audioChunks={audioChunks}
        autoPlay={isSpeaking}
        onTimeUpdateMs={handleTimeUpdateMs}
      />

      {/* Debug: mouth value indicator */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '3px 8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 6,
        fontSize: 11,
        fontFamily: 'monospace',
        color: mouthValue > 0.3 ? '#4ade80' : '#f87171',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        mouth: {mouthValue.toFixed(2)}
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          backgroundColor: 'rgba(26, 95, 180, 0.85)',
          borderRadius: '12px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 8 + Math.random() * 8,
                  backgroundColor: '#fff',
                  borderRadius: 2,
                  animation: `soundBar 0.${4 + i}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>讲解中...</span>
        </div>
      )}

      <style>{`
        @keyframes soundBar {
          from { height: 4px; }
          to { height: 16px; }
        }
      `}</style>
    </div>
  );
};

export default DigitalHuman;
