import type { VRM } from '@pixiv/three-vrm';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { Action } from './VRMIdleAnim';
import { sharedVRMIdleActionScheduler } from './vrmIdleActionScheduler';

export type DemoGLBAction =
  | 'wave'
  | 'thinking'
  | 'explain'
  | 'listen'
  | 'waiting1'
  | 'waiting2'
  | 'waiting3';

export type DemoAction = DemoGLBAction | 'showcase' | 'nod' | 'none';

export const DEMO_GLB_ACTION_ASSETS: Record<DemoGLBAction, number> = {
  wave: require('../../assets/animations/waving1.glb'),
  thinking: require('../../assets/animations/thinking.glb'),
  explain: require('../../assets/animations/explain.glb'),
  listen: require('../../assets/animations/listen.glb'),
  waiting1: require('../../assets/animations/waiting1.glb'),
  waiting2: require('../../assets/animations/waiting2.glb'),
  waiting3: require('../../assets/animations/waiting3.glb'),
};

const GLB_ACTIONS = new Set<DemoAction>(Object.keys(DEMO_GLB_ACTION_ASSETS) as DemoGLBAction[]);
const IDLE_ACTIONS: DemoGLBAction[] = ['waiting1', 'waiting2', 'waiting3'];
const clipCache = new Map<DemoGLBAction, Promise<THREE.AnimationClip>>();

interface DirectTrack {
  object: THREE.Object3D;
  interpolant: THREE.Interpolant;
  sourceBase: THREE.Quaternion;
  targetBase: THREE.Quaternion;
}

interface TrackParts {
  nodeName: string;
  property: string;
}

export function normalizeDemoAction(action: Action): DemoAction {
  switch (action) {
    case 'point':
      return 'showcase';
    case 'lookUp':
    case 'lookDown':
    case 'tiltHead':
    case 'shakeHead':
    case 'clap':
    case 'bow':
      return 'explain';
    default:
      return action as DemoAction;
  }
}

export function isDemoGLBAction(action: DemoAction): action is DemoGLBAction {
  return GLB_ACTIONS.has(action);
}

export function getTrackParts(trackName: string): TrackParts | null {
  const match = trackName.match(/^(.*?)\.(position|quaternion|scale|rotation)$/);
  if (!match) return null;
  let nodeName = match[1];
  const boneMatch = nodeName.match(/\.bones\[(.+?)\]$/);
  if (boneMatch) nodeName = boneMatch[1];
  nodeName = nodeName.replace(/^["']|["']$/g, '');
  return {
    nodeName,
    property: match[2] === 'rotation' ? 'quaternion' : match[2],
  };
}

export function isBindableHumanoidTrack(track: THREE.KeyframeTrack, vrm: VRM): boolean {
  const parts = getTrackParts(track.name);
  return Boolean(
    parts
    && parts.property === 'quaternion'
    && parts.nodeName.startsWith('J_Bip_')
    && vrm.scene.getObjectByName(parts.nodeName),
  );
}

function trackHasMotion(track: THREE.KeyframeTrack): boolean {
  const values = track.values;
  const itemSize = track.getValueSize();
  if (values.length <= itemSize) return false;
  for (let index = itemSize; index < values.length; index += 1) {
    if (Math.abs(values[index] - values[index % itemSize]) > 0.00001) return true;
  }
  return false;
}

async function getAssetUri(animationModule: number): Promise<string> {
  const asset = Asset.fromModule(animationModule);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('Animation asset URI is empty');
  return uri;
}

export function loadDemoActionClip(action: DemoGLBAction): Promise<THREE.AnimationClip> {
  const cached = clipCache.get(action);
  if (cached) return cached;

  const loading = getAssetUri(DEMO_GLB_ACTION_ASSETS[action]).then(async (uri) => {
    const gltf = await new GLTFLoader().loadAsync(uri);
    const clip = gltf.animations
      .map((candidate) => ({
        clip: candidate,
        bindableTracks: candidate.tracks.filter((track) => {
          const parts = getTrackParts(track.name);
          return parts?.property === 'quaternion'
            && parts.nodeName.startsWith('J_Bip_')
            && trackHasMotion(track);
        }).length,
      }))
      .sort((left, right) => right.bindableTracks - left.bindableTracks)[0]?.clip;
    if (!clip) throw new Error(`No animation clip found for ${action}`);
    return clip;
  });

  clipCache.set(action, loading);
  loading.catch(() => clipCache.delete(action));
  return loading;
}

export function createRelativeHumanoidTracks(vrm: VRM, clip: THREE.AnimationClip): DirectTrack[] {
  return clip.tracks.flatMap((track) => {
    if (!isBindableHumanoidTrack(track, vrm) || !trackHasMotion(track)) return [];
    const parts = getTrackParts(track.name);
    const object = parts ? vrm.scene.getObjectByName(parts.nodeName) : null;
    if (!object) return [];
    const interpolant = (track as any).createInterpolant(
      new Float32Array(track.getValueSize()),
    ) as THREE.Interpolant;
    const sourceBase = new THREE.Quaternion().fromArray(interpolant.evaluate(0)).normalize();
    return [{ object, interpolant, sourceBase, targetBase: object.quaternion.clone() }];
  });
}

export class VRMDemoActionPlayer {
  private activeAction: DemoGLBAction | null = null;
  private activeVRM: VRM | null = null;
  private duration = 0;
  private time = 0;
  private tracks: DirectTrack[] = [];
  private requestedAction: DemoAction = 'none';
  private requestedVRM: VRM | null = null;
  private wasIdleEligible: boolean | null = null;
  private loadGeneration = 0;
  private disposed = false;

  update(vrm: VRM, dt: number, _elapsed: number, requested: Action, speaking: boolean): void {
    const normalized = normalizeDemoAction(requested);
    const nowMs = Date.now();
    const idleEligible = normalized === 'none' && !speaking;
    if (this.wasIdleEligible !== null && idleEligible !== this.wasIdleEligible) {
      sharedVRMIdleActionScheduler.postpone(nowMs);
    }
    this.wasIdleEligible = idleEligible;

    if (vrm !== this.requestedVRM) {
      this.stopActive();
      this.requestedVRM = vrm;
    }

    if (normalized !== this.requestedAction) {
      this.requestedAction = normalized;
      if (isDemoGLBAction(normalized)) {
        if (this.activeAction !== normalized) {
          this.stopActive();
          void this.start(normalized, vrm);
        }
      } else if (normalized !== 'none' || this.activeAction?.startsWith('waiting')) {
        this.stopActive();
      }
    }

    if (normalized === 'none' && speaking && this.activeAction?.startsWith('waiting')) {
      this.stopActive();
    }

    if (this.tracks.length > 0) {
      this.time = Math.min(this.time + dt, this.duration);
      for (const track of this.tracks) {
        const sampled = new THREE.Quaternion()
          .fromArray(track.interpolant.evaluate(this.time))
          .normalize();
        const delta = track.sourceBase.clone().invert().multiply(sampled);
        track.object.quaternion.copy(track.targetBase).multiply(delta);
      }
      vrm.scene.updateMatrixWorld(true);
      if (this.time >= this.duration) {
        const completedIdleAction = this.activeAction?.startsWith('waiting') ?? false;
        this.stopActive();
        if (completedIdleAction) {
          sharedVRMIdleActionScheduler.postpone(nowMs);
        }
      }
      return;
    }

    if (idleEligible && sharedVRMIdleActionScheduler.claim(nowMs)) {
      const idleAction = IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
      void this.start(idleAction, vrm);
    }
  }

  applyPose(vrm: VRM): void {
    if (this.activeVRM !== vrm || this.tracks.length === 0) return;
    for (const track of this.tracks) {
      const sampled = new THREE.Quaternion()
        .fromArray(track.interpolant.evaluate(this.time))
        .normalize();
      const delta = track.sourceBase.clone().invert().multiply(sampled);
      track.object.quaternion.copy(track.targetBase).multiply(delta);
    }
    vrm.scene.updateMatrixWorld(true);
  }

  dispose(): void {
    this.disposed = true;
    this.requestedVRM = null;
    this.wasIdleEligible = null;
    this.loadGeneration += 1;
    this.stopActive();
  }

  private async start(action: DemoGLBAction, vrm: VRM): Promise<void> {
    const generation = ++this.loadGeneration;
    try {
      const clip = await loadDemoActionClip(action);
      if (this.disposed || generation !== this.loadGeneration) return;
      if (action.startsWith('waiting') && this.wasIdleEligible !== true) return;
      const tracks = createRelativeHumanoidTracks(vrm, clip);
      if (tracks.length === 0) throw new Error(`No bindable humanoid tracks found for ${action}`);
      this.activeAction = action;
      this.activeVRM = vrm;
      this.duration = clip.duration || 1;
      this.time = 0;
      this.tracks = tracks;
    } catch (error) {
      console.warn(`[VRMDemoActionPlayer] Failed to play ${action}:`, error);
    }
  }

  private stopActive(): void {
    this.loadGeneration += 1;
    for (const track of this.tracks) track.object.quaternion.copy(track.targetBase);
    this.activeVRM?.scene.updateMatrixWorld(true);
    this.activeAction = null;
    this.activeVRM = null;
    this.duration = 0;
    this.time = 0;
    this.tracks = [];
  }
}
