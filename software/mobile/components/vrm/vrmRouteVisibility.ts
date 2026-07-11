const OWN_VRM_PATHS = new Set([
  '/',
  '/chat',
  '/explore',
  '/attractions',
  '/routes',
  '/map',
  '/map-calibration',
  '/guide-demo',
  '/vrm-performance-demo',
  '/auth/login',
  '/auth/register',
  '/memory',
  '/profile',
  '/history',
]);

const OWN_VRM_PREFIXES: string[] = [
  '/attractions/',
  '/routes/',
];

export function normalizeVRMRoutePath(pathname: string): string {
  const withoutGroups = pathname.replace(/\/\([^/]+\)/g, '');
  const normalized = withoutGroups.length > 1
    ? withoutGroups.replace(/\/+$/, '')
    : withoutGroups;
  return normalized || '/';
}

export function shouldHideFloatingVRM(pathname: string): boolean {
  const routePath = normalizeVRMRoutePath(pathname);
  return OWN_VRM_PATHS.has(routePath)
    || OWN_VRM_PREFIXES.some((prefix) => routePath.startsWith(prefix));
}

export function shouldShowManualVRMLoadButton(pathname: string): boolean {
  return !shouldHideFloatingVRM(pathname);
}
