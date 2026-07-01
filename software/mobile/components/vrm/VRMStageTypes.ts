import type { Emotion } from './VRMTypes';
import type { Action } from './VRMIdleAnim';

export type VRMStageMode = 'float' | 'full';

export interface VRMStageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VRMStageFraming {
  targetHeight?: number;
  cameraDistance?: number;
  cameraY?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
}

export interface VRMStageTarget {
  id: string;
  mode: VRMStageMode;
  rect: VRMStageRect;
  costumeId?: string;
  expression?: Emotion;
  mouthOpen?: number;
  speaking?: boolean;
  action?: Action;
  actionDuration?: number;
  headRotation?: { x: number; y: number };
  zIndex?: number;
  borderRadius?: number;
  visible?: boolean;
  framing?: VRMStageFraming;
  updatedAt?: number;
}

export type VRMStageTargetPatch = Partial<Omit<VRMStageTarget, 'id'>>;
