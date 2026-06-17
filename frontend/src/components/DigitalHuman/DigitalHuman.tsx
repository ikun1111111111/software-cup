import React, { useCallback, useState, useRef } from 'react';
import VRMStage from '../VRM/VRMStage';
import type { DemoExpression, OutfitPreset } from '../VRM/VRMStage';
import EmotionController, { Emotion } from './EmotionController';
import LipSync, { type Phoneme } from './LipSync';
import AudioSync from './AudioSync';
import SpeakingExpressionController from './SpeakingExpressionController';
import SpeakingGestureController from './SpeakingGestureController';
import type { BoneTargets } from './SpeakingGestureController';

export interface DigitalHumanProps {
  modelPath?: string;
  texturePath?: string;
  texturePaths?: [string, string];
  cssFilter?: string;
  width?: number;
  height?: number;
  emotion?: Emotion;
  expression?: string | null;
  audioUrl?: string;
  audioChunks?: string[];
  phonemes?: Phoneme[] | null;
  isSpeaking?: boolean;
  /** Text being spoken (for expression generation) */
  speakingText?: string;
  onReady?: () => void;
  costumeId?: string;
}

const COSTUME_TO_VRM: Record<string, OutfitPreset> = {
  'festival-spring': 'festive',
  'festival-lantern': 'lantern',
  'festival-qingming': 'spring',
  'festival-dragon': 'festive',
  'festival-midautumn': 'moonlight',
  'festival-national': 'festive',
};

const COSTUME_TO_MODEL: Record<string, string> = {
  'festival-spring': '/models/8024308560058477433.vrm',
  'festival-lantern': '/models/4353238926149796085.vrm',
  'festival-qingming': '/models/5186055420774500970.vrm',
  'festival-dragon': '/models/4104272907947728185.vrm',
  'festival-midautumn': '/models/5784779633385764689.vrm',
  'festival-national': '/models/8511002460770470367.vrm',
};

const COSTUME_STAGE_CONFIG: Record<string, { cameraDistance?: number; modelOffsetY?: number }> = {
  'festival-spring':    { cameraDistance: 2.2, modelOffsetY: -0.04 },
  'festival-lantern':   { cameraDistance: 2.0 },
  'festival-qingming':  { cameraDistance: 2.2, modelOffsetY: -0.06 },
  'festival-dragon':    { cameraDistance: 2.0 },
  'festival-midautumn': { cameraDistance: 2.2, modelOffsetY: -0.06 },
  'festival-national':  { cameraDistance: 2.0, modelOffsetY: 0.05 },
};

const EXPRESSION_TO_VRM: Record<string, DemoExpression> = {
  f00: 'neutral',
  f01: 'happy',
  f02: 'relaxed',
  f03: 'surprised',
  f04: 'happy',
  f05: 'relaxed',
  f06: 'angry',
  f07: 'sad',
  smile: 'happy',
  happy: 'happy',
  think: 'relaxed',
  thinking: 'relaxed',
  sorry: 'sad',
  sad: 'sad',
  surprise: 'surprised',
  surprised: 'surprised',
  neutral: 'neutral',
  default: 'neutral',
};

const DEFAULT_VRM_URL = '/models/8024308560058477433.vrm';

const DigitalHuman: React.FC<DigitalHumanProps> = ({
  modelPath,
  width = 280,
  height = 380,
  emotion = 'neutral',
  expression,
  audioUrl,
  audioChunks,
  phonemes,
  isSpeaking = false,
  speakingText = '',
  onReady,
  costumeId = 'festival-spring',
}) => {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [lookAtX, setLookAtX] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [speakingExpression, setSpeakingExpression] = useState<string>('neutral');
  const [gestureTargets, setGestureTargets] = useState<BoneTargets | null>(null);

  React.useEffect(() => {
    onReady?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpressionChange = useCallback((_expr: string) => {}, []);

  const handleLipParamChange = useCallback((paramId: string, value: number) => {
    if (paramId === 'ParamMouthOpenY') {
      setMouthOpen(value);
    } else if (paramId === 'ParamAngleZ') {
      setLookAtX(value / 30);
    }
  }, []);

  const handleTimeUpdateMs = useCallback((ms: number) => {
    setCurrentTimeMs(ms);
  }, []);

  const handleTimeUpdate = useCallback((_time: number, duration: number) => {
    setAudioDurationSec(duration);
  }, []);

  React.useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(0);
      setLookAtX(0);
      setCurrentTimeMs(0);
    }
  }, [isSpeaking]);

  // Silent mode fallback: advance time when no audio source is driving currentTimeMs
  const silentStartRef = useRef(0);
  React.useEffect(() => {
    if (!isSpeaking || audioUrl || audioChunks?.length) return;
    silentStartRef.current = performance.now();
    const id = setInterval(() => {
      setCurrentTimeMs(performance.now() - silentStartRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [isSpeaking, audioUrl, audioChunks]);

  const vrmPreset: OutfitPreset = COSTUME_TO_VRM[costumeId] || 'modern';
  const vrmUrl = modelPath || COSTUME_TO_MODEL[costumeId] || DEFAULT_VRM_URL;
  // Use speaking expression when speaking, otherwise use manual expression or emotion
  const activeExpression = isSpeaking ? speakingExpression : (expression || emotion);
  const vrmExpression: DemoExpression = EXPRESSION_TO_VRM[activeExpression] || 'neutral';
  const stageConfig = COSTUME_STAGE_CONFIG[costumeId] || {};

  return (
    <div
      data-testid="digital-human"
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: '16px',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
        <VRMStage
          url={vrmUrl}
          expression={vrmExpression}
          mouthOpen={mouthOpen}
          outfitPreset={vrmPreset}
          lookAt={{ x: lookAtX, y: 0 }}
          cameraDistance={stageConfig.cameraDistance}
          modelOffsetY={stageConfig.modelOffsetY}
          isSpeaking={isSpeaking}
          gestureTargets={gestureTargets}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Speaking expression controller - changes expressions during speech */}
      <SpeakingExpressionController
        isSpeaking={isSpeaking}
        audioTimeSec={currentTimeMs / 1000}
        audioDurationSec={audioDurationSec}
        text={speakingText}
        onExpressionChange={setSpeakingExpression}
      />

      {/* Speaking gesture controller - semantic-based arm gestures */}
      <SpeakingGestureController
        isSpeaking={isSpeaking}
        audioTimeSec={currentTimeMs / 1000}
        audioDurationSec={audioDurationSec}
        text={speakingText}
        onGestureChange={setGestureTargets}
      />

      <EmotionController
        emotion={expression ? 'neutral' : emotion}
        onExpressionChange={expression ? undefined : handleExpressionChange}
        autoReset={!expression}
        resetDelay={5000}
      />

      <LipSync
        audioData={null}
        phonemes={phonemes}
        currentTimeMs={currentTimeMs}
        onParameterChange={handleLipParamChange}
        enabled={isSpeaking}
      />

      <AudioSync
        audioUrl={audioUrl}
        audioChunks={audioChunks}
        autoPlay={isSpeaking}
        onTimeUpdateMs={handleTimeUpdateMs}
        onTimeUpdate={handleTimeUpdate}
      />

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
