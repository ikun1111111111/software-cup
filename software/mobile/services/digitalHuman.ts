import type { Emotion, PageContext } from '@/components/vrm/VRMTypes';
import type { Action } from '@/components/vrm/VRMIdleAnim';

let managerPromise: Promise<any> | null = null;

export interface DigitalHumanSpeakOptions {
  duration?: number;
  action?: Action;
  actionDuration?: number;
  replaceCurrent?: boolean;
}

function loadVRMManager() {
  if (!managerPromise) {
    managerPromise = import('@/components/vrm/VRMManager').catch((error) => {
      managerPromise = null;
      throw error;
    });
  }
  return managerPromise;
}

export function speakWithDigitalHuman(
  text: string,
  emotion: Emotion | string = 'neutral',
  durationOrOptions?: number | DigitalHumanSpeakOptions,
): void {
  const duration = typeof durationOrOptions === 'number'
    ? durationOrOptions
    : durationOrOptions?.duration;
  const action = typeof durationOrOptions === 'number'
    ? undefined
    : durationOrOptions?.action;
  const actionDuration = typeof durationOrOptions === 'number'
    ? undefined
    : durationOrOptions?.actionDuration;
  const replaceCurrent = typeof durationOrOptions === 'number'
    ? false
    : durationOrOptions?.replaceCurrent;

  void loadVRMManager()
    .then(({ VRMManager }) => {
      const method = replaceCurrent ? VRMManager.replaceSpeech : VRMManager.speak;
      method.call(VRMManager, text, emotion as Emotion, duration, action, actionDuration);
    })
    .catch((error) => {
      console.warn('[DigitalHuman] speak failed:', error);
    });
}

export function stopDigitalHumanSpeech(playQueued = false): void {
  void loadVRMManager()
    .then(({ VRMManager }) => {
      VRMManager.stopSpeaking({ playQueued });
    })
    .catch((error) => {
      console.warn('[DigitalHuman] stop speech failed:', error);
    });
}

export function setDigitalHumanPageContext(
  context: PageContext,
  data?: Record<string, any>,
): void {
  void loadVRMManager()
    .then(({ VRMManager }) => {
      VRMManager.setPageContext(context, data);
    })
    .catch((error) => {
      console.warn('[DigitalHuman] set page context failed:', error);
    });
}

export function preloadDigitalHuman(modelFile: string): Promise<void> {
  return loadVRMManager()
    .then(({ VRMManager }) => VRMManager.preload(modelFile))
    .then(() => undefined);
}
