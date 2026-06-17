import { useCallback, useEffect, useState } from 'react';
import {
  COSTUMES,
  FESTIVAL_COSTUME_IDS,
  getCostume,
  type CostumeDef,
} from '../config/costumeMap';

const STORAGE_KEY = 'live2d-costume';

type CostumeMode = 'auto' | 'manual';

interface CostumeState {
  /** Currently active costume ID */
  costumeId: string;
  /** 'auto' = system picks based on date; 'manual' = user chose */
  mode: CostumeMode;
  /** The resolved costume definition */
  costume: CostumeDef;
}

/**
 * Check if a given date falls within a festival's date range.
 * Handles cross-month ranges (e.g. Spring Festival: Jan 20 – Feb 10).
 */
function isFestivalActive(
  now: Date,
  festivalMonth: number,
  dayRange: [number, number],
): boolean {
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();
  const [start, end] = dayRange;

  if (start <= end) {
    // Same month: e.g. [3, 6] in April
    return month === festivalMonth && day >= start && day <= end;
  }

  // Cross-month: e.g. [20, 10] means month=1 day>=20 OR month=2 day<=10
  if (month === festivalMonth && day >= start) return true;
  const nextMonth = festivalMonth === 12 ? 1 : festivalMonth + 1;
  if (month === nextMonth && day <= end) return true;

  return false;
}

/**
 * Auto-detect the active costume based on current date.
 * Checks festivals in order; falls back to first festival costume.
 */
function detectAutoCostumeId(): string {
  const now = new Date();

  // Check festivals first
  for (const id of FESTIVAL_COSTUME_IDS) {
    const def = COSTUMES[id];
    if (
      def.festivalMonth != null &&
      def.festivalDayRange != null &&
      isFestivalActive(now, def.festivalMonth, def.festivalDayRange)
    ) {
      return id;
    }
  }

  // Fall back to first festival costume
  return FESTIVAL_COSTUME_IDS[0];
}

/**
 * Hook: manages costume selection with auto-detection and manual override.
 *
 * - Auto mode: detects festival by date, falls back to first festival costume
 * - Manual mode: user-selected costume, persisted in localStorage
 */
export function useCostume() {
  const [state, setState] = useState<CostumeState>(() => {
    // Try restoring manual override from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && COSTUMES[saved]) {
      return {
        costumeId: saved,
        mode: 'manual' as CostumeMode,
        costume: getCostume(saved),
      };
    }
    const autoId = detectAutoCostumeId();
    return {
      costumeId: autoId,
      mode: 'auto' as CostumeMode,
      costume: getCostume(autoId),
    };
  });

  // Re-evaluate auto costume at midnight
  useEffect(() => {
    if (state.mode !== 'auto') return;

    const check = () => {
      const newId = detectAutoCostumeId();
      setState((prev) => {
        if (prev.costumeId === newId) return prev;
        return { costumeId: newId, mode: 'auto', costume: getCostume(newId) };
      });
    };

    // Check every 60 minutes (handles midnight crossover)
    const interval = setInterval(check, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state.mode]);

  /** User manually selects a costume. */
  const selectCostume = useCallback((costumeId: string) => {
    if (!COSTUMES[costumeId]) return;
    localStorage.setItem(STORAGE_KEY, costumeId);
    setState({
      costumeId,
      mode: 'manual',
      costume: getCostume(costumeId),
    });
  }, []);

  /** Switch back to auto-detection mode. */
  const resetToAuto = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const autoId = detectAutoCostumeId();
    setState({
      costumeId: autoId,
      mode: 'auto',
      costume: getCostume(autoId),
    });
  }, []);

  return {
    ...state,
    /** VRM model path for the current costume */
    modelPath: state.costume.modelPath,
    selectCostume,
    resetToAuto,
    /** Whether current costume is a festival costume */
    isFestival: state.costume.category === 'festival',
  };
}

export default useCostume;
