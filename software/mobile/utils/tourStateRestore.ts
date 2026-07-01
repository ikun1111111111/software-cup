import type { TourState } from '@/hooks/useTourOrchestrator';
import { createInitialGuideRuntime } from '@/utils/guideRuntime';

const EMPTY_PROGRESS = { total: 0, completed: 0, current: 0 };

export function restoreIdleTourState(saved: Partial<TourState>): Partial<TourState> {
  const restored: Partial<TourState> = {
    ...saved,
    status: 'idle',
    guideRuntime: createInitialGuideRuntime(),
    currentRoute: null,
    currentSpot: null,
    nextSpot: null,
    progress: { ...EMPTY_PROGRESS },
    narration: null,
    isLoading: false,
    error: null,
    distanceInfo: null,
    checkinResult: null,
    pendingCheckin: null,
    checkinIntent: null,
    activeIntent: null,
  };

  if (saved.preferences) {
    restored.preferences = {
      ...saved.preferences,
      mode: 'free',
    };
  }

  if (saved.guideSession) {
    restored.guideSession = {
      ...saved.guideSession,
      status: 'idle',
      currentRoute: undefined,
      currentStopId: undefined,
      nextStopId: undefined,
      completedStopIds: [],
    };
  }

  if (saved.soloTour) {
    restored.soloTour = {
      ...saved.soloTour,
      enabled: false,
      pendingDeviation: null,
      summary: null,
    };
  }

  return restored;
}
