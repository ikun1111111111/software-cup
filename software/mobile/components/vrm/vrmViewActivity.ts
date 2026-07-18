export type VRMViewFocusMode = 'route' | 'component';

interface ResolveVRMViewActivityOptions {
  focusMode: VRMViewFocusMode;
  mounted: boolean;
  screenFocused: boolean;
}

export function resolveVRMViewActivity({
  focusMode,
  mounted,
  screenFocused,
}: ResolveVRMViewActivityOptions): boolean {
  if (!mounted) return false;
  return focusMode === 'component' || screenFocused;
}
