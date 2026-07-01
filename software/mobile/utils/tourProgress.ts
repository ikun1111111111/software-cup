export interface TourProgressSpot {
  id: string;
  name: string;
}

export interface TourProgressSnapshot {
  total: number;
  completed: number;
  current: number;
}

export interface TourCompletionTransition<TSpot extends TourProgressSpot> {
  progress: TourProgressSnapshot;
  currentSpot: TSpot | null;
  nextSpot: TSpot | null;
  isTourComplete: boolean;
}

export interface TourArrivalTransition<TSpot extends TourProgressSpot> {
  progress: TourProgressSnapshot;
  currentSpot: TSpot;
  nextSpot: TSpot | null;
}

export function getTourCompletionTransition<TSpot extends TourProgressSpot>(
  routeSpots: TSpot[],
  progress: Pick<TourProgressSnapshot, 'total' | 'completed'>,
  completedSpot: Pick<TourProgressSpot, 'id'>,
): TourCompletionTransition<TSpot> {
  const total = progress.total || routeSpots.length;
  const completedIndex = routeSpots.findIndex((routeSpot) => routeSpot.id === completedSpot.id);
  const safeCompletedIndex = completedIndex >= 0 ? completedIndex : progress.completed;
  const completed = Math.min(safeCompletedIndex + 1, total);
  const isTourComplete = completed >= total;

  return {
    progress: {
      total,
      completed,
      current: isTourComplete ? total : completed + 1,
    },
    currentSpot: routeSpots[completed] || null,
    nextSpot: routeSpots[completed + 1] || null,
    isTourComplete,
  };
}

export function getTourArrivalTransition<TSpot extends TourProgressSpot>(
  routeSpots: TSpot[],
  progress: TourProgressSnapshot,
  arrivedSpot: TSpot,
): TourArrivalTransition<TSpot> {
  const total = progress.total || routeSpots.length;
  const routeIndex = routeSpots.findIndex((routeSpot) => routeSpot.id === arrivedSpot.id);

  if (routeIndex < 0) {
    return {
      progress: {
        total,
        completed: progress.completed,
        current: progress.current,
      },
      currentSpot: arrivedSpot,
      nextSpot: null,
    };
  }

  return {
    progress: {
      total,
      completed: Math.max(progress.completed, routeIndex),
      current: Math.min(routeIndex + 1, total),
    },
    currentSpot: routeSpots[routeIndex],
    nextSpot: routeSpots[routeIndex + 1] || null,
  };
}
