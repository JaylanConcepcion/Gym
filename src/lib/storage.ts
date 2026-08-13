import type {
  AppData,
  BodyWeightEntry,
  ExerciseDef,
  ExerciseVisibility,
  Session,
  Tombstone,
  WorkoutTemplate
} from './types';

const STORAGE_KEY = 'pl-tracker/v1';

export function defaultData(): AppData {
  return {
    version: 2,
    settings: { units: 'lb' },
    settingsUpdatedAt: 0,
    customExercises: [],
    sessions: [],
    bodyWeights: [],
    tombstones: [],
    templates: [],
    hiddenExercises: [],
    profile: { heightCm: null, age: null, sex: null },
    profileUpdatedAt: 0
  };
}

/**
 * Shape-check untrusted JSON (storage, an imported backup, or a synced gist).
 * Accepts v1 documents and migrates them to v2 (timestamps default to 0 so
 * any real edit wins a merge against migrated data).
 */
export function normalizeData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as {
    version?: number;
    settings?: { units?: string };
    settingsUpdatedAt?: number;
    customExercises?: unknown[];
    sessions?: unknown[];
    bodyWeights?: unknown[];
    tombstones?: unknown[];
    templates?: unknown[];
    hiddenExercises?: unknown[];
    profile?: { heightCm?: unknown; age?: unknown; sex?: unknown };
    profileUpdatedAt?: number;
  };
  if (d.version !== 1 && d.version !== 2) return null;
  if (!d.settings || (d.settings.units !== 'lb' && d.settings.units !== 'kg')) return null;
  if (!Array.isArray(d.sessions) || !Array.isArray(d.bodyWeights) || !Array.isArray(d.customExercises)) {
    return null;
  }
  return {
    version: 2,
    settings: { units: d.settings.units },
    settingsUpdatedAt: typeof d.settingsUpdatedAt === 'number' ? d.settingsUpdatedAt : 0,
    customExercises: (d.customExercises as ExerciseDef[]).map((e) => ({
      id: e.id,
      name: e.name,
      isCustom: true,
      tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === 'string') : [],
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : 0,
      updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : 0
    })),
    sessions: (d.sessions as Session[]).map((s) => ({
      id: s.id,
      date: s.date,
      blocks: s.blocks,
      cardio: Array.isArray(s.cardio) ? s.cardio : [],
      updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0
    })),
    bodyWeights: (d.bodyWeights as BodyWeightEntry[]).map((b) => ({
      date: b.date,
      weightKg: b.weightKg,
      updatedAt: typeof b.updatedAt === 'number' ? b.updatedAt : 0
    })),
    tombstones: Array.isArray(d.tombstones) ? (d.tombstones as Tombstone[]) : [],
    templates: Array.isArray(d.templates)
      ? (d.templates as WorkoutTemplate[]).map((t) => ({
          id: t.id,
          name: t.name,
          exerciseIds: Array.isArray(t.exerciseIds) ? t.exerciseIds : [],
          updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : 0
        }))
      : [],
    hiddenExercises: Array.isArray(d.hiddenExercises)
      ? (d.hiddenExercises as ExerciseVisibility[]).map((h) => ({
          id: h.id,
          hidden: !!h.hidden,
          updatedAt: typeof h.updatedAt === 'number' ? h.updatedAt : 0
        }))
      : [],
    profile: {
      heightCm: typeof d.profile?.heightCm === 'number' ? d.profile.heightCm : null,
      age: typeof d.profile?.age === 'number' ? d.profile.age : null,
      sex: d.profile?.sex === 'm' || d.profile?.sex === 'f' ? d.profile.sex : null
    },
    profileUpdatedAt: typeof d.profileUpdatedAt === 'number' ? d.profileUpdatedAt : 0
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
