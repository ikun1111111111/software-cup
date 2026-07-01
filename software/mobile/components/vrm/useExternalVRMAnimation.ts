import { useCallback, useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

import { VRMManager } from './VRMManager';

export type ExternalAnimationStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

interface UseExternalVRMAnimationOptions {
  animationModule: number;
  loop?: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCurrentVRM(timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const vrm = VRMManager.getVRM();
    if (vrm) return vrm;
    await wait(100);
  }
  throw new Error('VRM model is not ready yet');
}

async function getAssetUri(animationModule: number): Promise<string> {
  const asset = Asset.fromModule(animationModule);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) {
    throw new Error('Animation asset URI is empty');
  }
  return uri;
}

export function useExternalVRMAnimation({
  animationModule,
  loop = false,
}: UseExternalVRMAnimationOptions) {
  const [status, setStatus] = useState<ExternalAnimationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [clipName, setClipName] = useState('');
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const loadingRef = useRef<Promise<THREE.AnimationAction> | null>(null);

  const load = useCallback(async () => {
    if (actionRef.current) return actionRef.current;
    if (loadingRef.current) return loadingRef.current;

    const loading = (async () => {
      setStatus('loading');
      setErrorMessage('');

      const [vrm, uri] = await Promise.all([
        waitForCurrentVRM(),
        getAssetUri(animationModule),
      ]);

      const gltf = await new GLTFLoader().loadAsync(uri);
      const clip = gltf.animations[0];
      if (!clip) {
        throw new Error('No animation clip found in this GLB');
      }

      const nextMixer = new THREE.AnimationMixer(vrm.scene);
      const nextAction = nextMixer.clipAction(clip);
      nextAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
      nextAction.clampWhenFinished = true;
      nextMixer.addEventListener('finished', () => {
        setStatus('ready');
      });

      mixerRef.current = nextMixer;
      actionRef.current = nextAction;
      setMixer(nextMixer);
      setClipName(clip.name || 'Animation 1');
      setStatus('ready');
      return nextAction;
    })();

    loadingRef.current = loading;
    try {
      return await loading;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load animation';
      setErrorMessage(message);
      setStatus('error');
      throw error;
    } finally {
      loadingRef.current = null;
    }
  }, [animationModule, loop]);

  const play = useCallback(async () => {
    try {
      const action = await load();
      action.reset();
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      action.play();
      setStatus('playing');
    } catch {
      // The status and message are already stored for the demo UI.
    }
  }, [load]);

  const stop = useCallback(() => {
    actionRef.current?.stop();
    mixerRef.current?.stopAllAction();
    setStatus(actionRef.current ? 'ready' : 'idle');
  }, []);

  useEffect(() => () => {
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    actionRef.current = null;
  }, []);

  return {
    mixer,
    status,
    errorMessage,
    clipName,
    play,
    stop,
  };
}
