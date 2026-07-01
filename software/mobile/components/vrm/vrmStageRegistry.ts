import type { VRMStageTarget } from './VRMStageTypes';

export function hasUsableStageRect(target: VRMStageTarget | null): boolean {
  if (!target) return false;
  return target.visible !== false
    && target.rect.width > 0
    && target.rect.height > 0;
}

export function getActiveStageTarget(targets: VRMStageTarget[]): VRMStageTarget | null {
  if (targets.length === 0) return null;
  const sorted = [...targets].sort((a, b) => {
    const updatedDiff = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    if (updatedDiff !== 0) return updatedDiff;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}
