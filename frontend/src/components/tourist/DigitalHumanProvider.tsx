import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGuideSpeech } from '../../hooks/useGuideSpeech';
import { useCostume } from '../../hooks/useCostume';
import type { Emotion } from '../DigitalHuman/EmotionController';
import type { PhonemeTimestamp } from '../../api/tts';

const GalgameScene = React.lazy(() => import('../Galgame/GalgameScene'));

export type DigitalHumanPose = 'center' | 'left' | 'right' | 'left-stage' | 'kiosk-stage' | 'route-stage';

export interface DigitalHumanContextValue {
  isSpeaking: boolean;
  emotion: Emotion;
  isModelReady: boolean;
  modelError: string | null;
  speak: (text: string, opts?: { emotion?: Emotion; onComplete?: () => void; onError?: () => void }) => Promise<void>;
  speakBrowserFallback: (text: string, opts?: { emotion?: Emotion; onComplete?: () => void; onError?: () => void }) => void;
  stop: () => void;
  setEmotion: (emotion: Emotion) => void;
  startStream: () => void;
  appendAudioChunk: (chunk: string) => void;
  setPhonemes: (phonemes: PhonemeTimestamp[] | null) => void;
  setSpeaking: (speaking: boolean) => void;
  setPoseOverride: (pose: DigitalHumanPose | null) => void;
}

const DigitalHumanContext = createContext<DigitalHumanContextValue | null>(null);

export function useDigitalHuman(): DigitalHumanContextValue {
  const ctx = useContext(DigitalHumanContext);
  if (!ctx) {
    throw new Error('useDigitalHuman must be used within DigitalHumanProvider');
  }
  return ctx;
}

interface DigitalHumanProviderProps {
  children: React.ReactNode;
  pose?: DigitalHumanPose;
  sceneVariant?: 'modern' | 'minimal' | 'zen';
  hideSceneBackground?: boolean;
}

const POSE_CONFIG: Record<DigitalHumanPose, { left: string; bottom: string; scale: number; headAngleX?: number }> = {
  center: { left: '50%', bottom: '8%', scale: 1.08, headAngleX: 0 },
  left: { left: '18%', bottom: '6%', scale: 1.05, headAngleX: 8 },
  'left-stage': { left: '10%', bottom: '6%', scale: 1.0, headAngleX: 10 },
  'kiosk-stage': { left: '34%', bottom: '5%', scale: 1.14, headAngleX: 6 },
  'route-stage': { left: '21%', bottom: '5%', scale: 1.08, headAngleX: 12 },
  right: { left: '82%', bottom: '6%', scale: 1.05, headAngleX: -8 },
};

export const DigitalHumanProvider: React.FC<DigitalHumanProviderProps> = ({
  children,
  pose = 'center',
  sceneVariant,
  hideSceneBackground = false,
}) => {
  const { cssFilter } = useCostume();
  const guide = useGuideSpeech();
  const [poseOverride, setPoseOverride] = useState<DigitalHumanPose | null>(null);
  const effectivePose = poseOverride ?? pose;
  const config = POSE_CONFIG[effectivePose];
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [shouldMountModel, setShouldMountModel] = useState(false);

  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
    setModelError(null);
  }, []);

  const handleModelError = useCallback((message: string) => {
    setIsModelReady(false);
    setModelError(message);
  }, []);

  // Stable context value — only recreate when guide state actually changes
  const value = useMemo(
    () => ({
      isSpeaking: guide.isSpeaking,
      emotion: guide.emotion,
      isModelReady,
      modelError,
      speak: guide.speak,
      speakBrowserFallback: guide.speakBrowserFallback,
      stop: guide.stop,
      setEmotion: guide.setEmotion,
      startStream: guide.startStream,
      appendAudioChunk: guide.appendAudioChunk,
      setPhonemes: guide.setPhonemes,
      setSpeaking: guide.setSpeaking,
      setPoseOverride,
    }),
    [
      guide.isSpeaking,
      guide.emotion,
      isModelReady,
      modelError,
      guide.speak,
      guide.speakBrowserFallback,
      guide.stop,
      guide.setEmotion,
      guide.startStream,
      guide.appendAudioChunk,
      guide.setPhonemes,
      guide.setSpeaking,
    ]
  );

  const sceneVariantResolved = sceneVariant ?? (effectivePose === 'center' ? 'modern' : 'minimal');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShouldMountModel(true);
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <DigitalHumanContext.Provider value={value}>
      {children}

      {shouldMountModel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <Suspense fallback={null}>
          <GalgameScene
            variant={sceneVariantResolved}
            emotion={guide.emotion}
            cssFilter={cssFilter}
            isSpeaking={guide.isSpeaking}
            audioChunks={guide.audioChunks}
            phonemes={guide.phonemes}
            characterName="小景"
            characterStatus="在线"
            characterLeft={config.left}
            characterBottom={config.bottom}
            characterScale={config.scale}
            isMobile={false}
            headAngleX={config.headAngleX}
            hideBackground={hideSceneBackground}
            onReady={handleModelReady}
            onError={handleModelError}
            onAudioEnded={() => guide.setSpeaking(false)}
          />
          </Suspense>
        </div>
      )}
    </DigitalHumanContext.Provider>
  );
};
