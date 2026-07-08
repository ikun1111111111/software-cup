import React, { useCallback, useRef, useState, useEffect } from 'react';
import Live2DStage, { Live2DModelActions } from './Live2DStage';
import EmotionController, { Emotion } from './EmotionController';
import LipSync, { type Phoneme } from './LipSync';
import AudioSync from './AudioSync';
import { useIdleAnimation } from '../../hooks/useIdleAnimation';
import { motionForEmotion } from '../../utils/emotion';

export interface DigitalHumanProps {
  modelPath?: string;
  /** Costume texture path from useCostume hook. */
  texturePath?: string;
  /** CSS filter for costume visual variation. */
  cssFilter?: string;
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
  /** Remove background frame, shadow, and rounded corners. Useful when layering over a custom background. */
  transparentBg?: boolean;
  /** Live2D head horizontal angle in degrees. Positive = facing right, negative = facing left. */
  headAngleX?: number;
  /** Called when streamed audio playback ends. */
  onAudioEnded?: () => void;
  /** Called when the Live2D model fails to load. */
  onError?: (message: string) => void;
}

const DEFAULT_MODEL = '/models/haru/haru_greeter_t03.model3.json';

const DigitalHuman: React.FC<DigitalHumanProps> = ({
  modelPath = DEFAULT_MODEL,
  texturePath,
  cssFilter,
  width = 280,
  height = 380,
  emotion = 'neutral',
  expression,
  audioUrl,
  audioChunks,
  phonemes,
  isSpeaking = false,
  onReady,
  transparentBg = false,
  headAngleX,
  onAudioEnded,
  onError,
}) => {
  const actionsRef = useRef<Live2DModelActions | null>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const currentTimeMsRef = useRef(0);
  const mouthValueRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);

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

  // Head angle control
  useEffect(() => {
    if (actionsRef.current && headAngleX !== undefined) {
      actionsRef.current.setParameter('ParamAngleX', headAngleX);
    }
  }, [headAngleX]);

  // Direct expression control
  useEffect(() => {
    if (expression && actionsRef.current) {
      actionsRef.current.setExpression(expression);
    }
  }, [expression]);

  // Trigger motion when emotion changes
  useEffect(() => {
    const motionGroup = motionForEmotion(emotion);
    if (motionGroup && actionsRef.current) {
      try {
        actionsRef.current.motion(motionGroup);
      } catch {
        // Model may not have this motion group
      }
    }
  }, [emotion]);

  // Expression change from EmotionController
  const handleExpressionChange = useCallback((expression: string) => {
    actionsRef.current?.setExpression(expression);
  }, []);

  // Lip sync parameter change — also track mouth value for debugging
  const handleLipParamChange = useCallback((paramId: string, value: number) => {
    actionsRef.current?.setParameter(paramId, value);
    if (paramId === 'ParamMouthOpenY') {
      mouthValueRef.current = value;
    }
  }, []);

  // Update current time in ms for phoneme matching and text-audio sync
  const handleTimeUpdateMs = useCallback((ms: number) => {
    currentTimeMsRef.current = ms;
  }, []);

  // Fallback audio data generation when no phonemes available
  // Use a single low-frequency interval to avoid flooding React state updates.
  useEffect(() => {
    mountedRef.current = true;

    if (isSpeaking && !phonemes?.length) {
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        const simulated = new Float32Array(128);
        const t = Date.now() / 100;
        for (let i = 0; i < 128; i++) {
          simulated[i] = (Math.random() * 0.5 + 0.2) * Math.sin(t);
        }
        setAudioData(simulated);
      }, 120);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
      };
    } else {
      setAudioData(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }
  }, [isSpeaking, phonemes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, []);

  return (
    <div
      data-testid="digital-human"
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: transparentBg ? 0 : '16px',
        background: transparentBg ? 'transparent' : 'linear-gradient(180deg, rgba(247,245,240,0.9) 0%, rgba(237,232,222,0.85) 60%, rgba(222,214,200,0.7) 100%)',
        overflow: transparentBg ? 'visible' : 'hidden',
      }}
    >
      {!transparentBg && (
        <>
          {/* 宣纸纹理 overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          {/* 淡墨山水装饰 - 底部远山轮廓 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(180deg, transparent 0%, rgba(168,156,140,0.08) 40%, rgba(140,128,112,0.15) 100%)',
            borderRadius: '0 0 16px 16px',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        </>
      )}
      {/* Live2D Model */}
      <Live2DStage
        modelPath={modelPath}
        texturePath={texturePath}
        cssFilter={cssFilter}
        width={width}
        height={height}
        scale={0.18}
        onModelLoaded={handleModelLoaded}
        onModelRef={handleModelRef}
        onError={onError}
        transparentOverlay={transparentBg}
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
        currentTimeMsRef={currentTimeMsRef}
        onParameterChange={handleLipParamChange}
        enabled={isSpeaking}
      />

      {/* Audio Sync */}
      <AudioSync
        audioUrl={audioUrl}
        audioChunks={audioChunks}
        autoPlay={isSpeaking}
        onTimeUpdateMs={handleTimeUpdateMs}
        onEnded={onAudioEnded}
      />

      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          backgroundColor: 'rgba(42, 37, 32, 0.65)',
          borderRadius: 'var(--radius-pill)',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: 16 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 6 + (i + 1) * 4,
                  backgroundColor: 'var(--gold-leaf)',
                  borderRadius: 2,
                  animation: `soundBar 0.${5 + i}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#F3EFE6', fontWeight: 500, letterSpacing: '0.05em' }}>讲解中</span>
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
