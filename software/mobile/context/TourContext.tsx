import React, { createContext, useContext, useMemo } from 'react';
import { useTourOrchestrator } from '@/hooks/useTourOrchestrator';
import type { TourState } from '@/hooks/useTourOrchestrator';

// ============ Context ============

interface TourContextValue {
  state: TourState;
  actions: ReturnType<typeof useTourOrchestrator>[1];
}

const TourContext = createContext<TourContextValue | null>(null);

// ============ Provider ============

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, actions] = useTourOrchestrator();

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

// ============ Hook ============

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return [ctx.state, ctx.actions] as const;
}
