import type { Emotion, PageContext } from '@/components/vrm/VRMTypes';

let managerPromise: Promise<any> | null = null;

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
  duration?: number,
): void {
  void loadVRMManager()
    .then(({ VRMManager }) => {
      VRMManager.speak(text, emotion as Emotion, duration);
    })
    .catch((error) => {
      console.warn('[DigitalHuman] speak failed:', error);
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
