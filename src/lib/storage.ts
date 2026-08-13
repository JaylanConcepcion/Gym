import type { AppData } from './types';

const STORAGE_KEY = 'pl-tracker/v1';

export function defaultData(): AppData {
  return {
    version: 1,
    settings: { units: 'lb' },
    customExercises: [],
    sessions: [],
    bodyWeights: []
  };
}

/** Shape-check untrusted JSON (storage or an imported backup file). */
export function normalizeData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<AppData>;
  if (d.version !== 1) return null;
  if (!d.settings || (d.settings.units !== 'lb' && d.settings.units !== 'kg')) return null;
  if (!Array.isArray(d.sessions) || !Array.isArray(d.bodyWeights) || !Array.isArray(d.customExercises)) {
    return null;
  }
  return {
    version: 1,
    settings: { units: d.settings.units },
    customExercises: d.customExercises,
    sessions: d.sessions,
    bodyWeights: d.bodyWeights
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return normalizeData(JSON.parse(raw)) ?? defaultData();
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode edge cases); the app keeps working in-memory.
  }
}
