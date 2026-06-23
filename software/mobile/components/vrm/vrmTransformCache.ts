export type VRMRenderMode = 'full' | 'float';

export function createVRMTransformKey(modelFile: string, mode: VRMRenderMode): string {
  return `${modelFile || 'avatar.vrm'}::${mode}`;
}
