export type GuideMode = 'companion' | 'proactive';
export type CompanionLevel = 'quiet' | 'balanced' | 'active';

export type GuideRuntimeStatus =
  | 'idle'
  | 'suggesting'
  | 'navigating'
  | 'arrived'
  | 'narrating'
  | 'free_roam'
  | 'conversing'
  | 'summary';

export interface GuideRuntimeSpot {
  id: string;
  name: string;
  description?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
}

export interface GuideRuntimeRoute {
  id: string;
  name: string;
  spots: GuideRuntimeSpot[];
  description?: string;
  duration?: string;
  route_type?: string;
}

export interface GuideRuntime {
  mode: GuideMode;
  companionLevel: CompanionLevel;
  status: GuideRuntimeStatus;
  activeIntent: string | null;
  currentRoute: GuideRuntimeRoute | null;
  currentSpot: GuideRuntimeSpot | null;
  nextSpot: GuideRuntimeSpot | null;
  sourcePage: string | null;
  prompt: string | null;
  narration: unknown | null;
}

export interface StartGuideRuntimeInput {
  route?: GuideRuntimeRoute | null;
  mode: GuideMode;
  companionLevel?: CompanionLevel;
  activeIntent?: string | null;
  sourcePage: string;
}

export interface FreeRoamGuideRuntimeInput {
  companionLevel?: CompanionLevel;
  activeIntent?: string | null;
  sourcePage: string;
}

function defaultCompanionLevel(mode: GuideMode): CompanionLevel {
  return mode === 'proactive' ? 'active' : 'balanced';
}

function statusForMode(mode: GuideMode, hasRoute: boolean): GuideRuntimeStatus {
  if (!hasRoute) return mode === 'proactive' ? 'suggesting' : 'idle';
  return mode === 'proactive' ? 'navigating' : 'free_roam';
}

export function createInitialGuideRuntime(): GuideRuntime {
  return {
    mode: 'companion',
    companionLevel: 'balanced',
    status: 'idle',
    activeIntent: null,
    currentRoute: null,
    currentSpot: null,
    nextSpot: null,
    sourcePage: null,
    prompt: null,
    narration: null,
  };
}

export function createStartedGuideRuntime(input: StartGuideRuntimeInput): GuideRuntime {
  const route = input.route ?? null;
  return {
    mode: input.mode,
    companionLevel: input.companionLevel ?? defaultCompanionLevel(input.mode),
    status: statusForMode(input.mode, Boolean(route)),
    activeIntent: input.activeIntent ?? null,
    currentRoute: route,
    currentSpot: route?.spots[0] ?? null,
    nextSpot: route?.spots[1] ?? null,
    sourcePage: input.sourcePage,
    prompt: null,
    narration: null,
  };
}

export function createFreeRoamGuideRuntime(input: FreeRoamGuideRuntimeInput): GuideRuntime {
  return {
    mode: 'companion',
    companionLevel: input.companionLevel ?? 'balanced',
    status: 'free_roam',
    activeIntent: input.activeIntent ?? null,
    currentRoute: null,
    currentSpot: null,
    nextSpot: null,
    sourcePage: input.sourcePage,
    prompt: null,
    narration: null,
  };
}

export function setGuideRuntimeMode(
  runtime: GuideRuntime,
  mode: GuideMode,
  companionLevel = defaultCompanionLevel(mode),
): GuideRuntime {
  return {
    ...runtime,
    mode,
    companionLevel,
    status: statusForMode(mode, Boolean(runtime.currentRoute)),
  };
}
