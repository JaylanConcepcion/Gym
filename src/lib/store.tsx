import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode
} from 'react';
import { builtinIdForName } from './exercises';
import { mergeData } from './merge';
import { defaultData, loadData, saveData } from './storage';
import type { AppData, Profile, Session, Tombstone, Units } from './types';

type Action =
  | { type: 'add-block'; date: string; blockId: string; exerciseId: string; at: number }
  | { type: 'remove-block'; date: string; blockId: string; at: number }
  | { type: 'add-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null; at: number }
  | { type: 'update-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null; at: number }
  | { type: 'remove-set'; date: string; blockId: string; setId: string; at: number }
  | { type: 'delete-session'; date: string; at: number }
  | { type: 'set-bodyweight'; date: string; weightKg: number | null; at: number }
  | { type: 'set-units'; units: Units; at: number }
  | { type: 'add-custom-exercise'; id: string; name: string; tags: string[]; at: number }
  | { type: 'update-exercise'; id: string; name: string; tags: string[]; at: number }
  | { type: 'remove-custom-exercise'; id: string; at: number }
  | { type: 'save-template'; id: string; name: string; exerciseIds: string[]; at: number }
  | { type: 'delete-template'; id: string; at: number }
  | { type: 'set-exercise-hidden'; id: string; hidden: boolean; at: number }
  | { type: 'apply-template'; date: string; blocks: Array<{ blockId: string; exerciseId: string }>; at: number }
  | { type: 'add-cardio'; date: string; cardioId: string; durationMin: number; speedKmh: number; inclinePct: number; at: number }
  | { type: 'remove-cardio'; date: string; cardioId: string; at: number }
  | { type: 'set-profile'; profile: Profile; at: number }
  | { type: 'import-data'; data: AppData }
  | { type: 'merge-remote'; remote: AppData }
  | { type: 'clear-all' };

function withTombstone(tombstones: Tombstone[], t: Tombstone): Tombstone[] {
  return [...tombstones.filter((x) => !(x.type === t.type && x.key === t.key)), t];
}

/**
 * Lamport-style timestamp: strictly newer than anything this device has seen
 * for the entity, even if another device's clock runs ahead of ours. Without
 * this, a workout edited on a fast-clock device could out-timestamp its own
 * deletion and resurrect on every sync.
 */
function bump(at: number, prev: number | undefined | null): number {
  return Math.max(at, (prev ?? 0) + 1);
}

function tombFor(tombstones: Tombstone[], type: Tombstone['type'], key: string): number {
  return tombstones.find((t) => t.type === type && t.key === key)?.deletedAt ?? 0;
}

function upsertSession(
  data: AppData,
  date: string,
  at: number,
  fn: (s: Session) => Session
): Session[] {
  const existing = data.sessions.find((s) => s.date === date);
  // Beat both the previous edit and any deletion tombstone for this day, so
  // re-logging a deleted day can't be swallowed by its old tombstone.
  const stamped = bump(at, Math.max(existing?.updatedAt ?? 0, tombFor(data.tombstones, 'session', date)));
  if (existing) {
    return data.sessions.map((s) => (s.date === date ? { ...fn(s), updatedAt: stamped } : s));
  }
  return [
    ...data.sessions,
    {
      ...fn({ id: `session-${date}`, date, blocks: [], cardio: [], updatedAt: stamped }),
      updatedAt: stamped
    }
  ];
}

function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'add-block':
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => ({
          ...s,
          blocks: [...s.blocks, { id: action.blockId, exerciseId: action.exerciseId, sets: [] }]
        }))
      };
    case 'remove-block': {
      const sessions = data.sessions
        .map((s) =>
          s.date === action.date
            ? {
                ...s,
                blocks: s.blocks.filter((b) => b.id !== action.blockId),
                updatedAt: bump(action.at, s.updatedAt)
              }
            : s
        )
        .filter((s) => s.blocks.length > 0 || s.cardio.length > 0);
      return { ...data, sessions };
    }
    case 'add-set': {
      // Set actions never create sessions/blocks; if the block is gone (e.g.
      // deleted just before a deferred auto-commit), this must be a no-op so
      // it can't resurrect an empty ghost session.
      const target = data.sessions.find((s) => s.date === action.date);
      if (!target || !target.blocks.some((b) => b.id === action.blockId)) return data;
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id !== action.blockId
              ? b
              : {
                  ...b,
                  sets: [
                    ...b.sets,
                    { id: action.setId, weightKg: action.weightKg, reps: action.reps, rpe: action.rpe }
                  ]
                }
          )
        }))
      };
    }
    case 'update-set': {
      const target = data.sessions.find((s) => s.date === action.date);
      if (!target || !target.blocks.some((b) => b.id === action.blockId)) return data;
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id !== action.blockId
              ? b
              : {
                  ...b,
                  sets: b.sets.map((set) =>
                    set.id === action.setId
                      ? { ...set, weightKg: action.weightKg, reps: action.reps, rpe: action.rpe }
                      : set
                  )
                }
          )
        }))
      };
    }
    case 'remove-set': {
      const target = data.sessions.find((s) => s.date === action.date);
      if (!target || !target.blocks.some((b) => b.id === action.blockId)) return data;
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id !== action.blockId ? b : { ...b, sets: b.sets.filter((set) => set.id !== action.setId) }
          )
        }))
      };
    }
    case 'delete-session': {
      const victim = data.sessions.find((s) => s.date === action.date);
      return {
        ...data,
        sessions: data.sessions.filter((s) => s.date !== action.date),
        tombstones: withTombstone(data.tombstones, {
          type: 'session',
          key: action.date,
          // Strictly newer than the copy being deleted — beats clock skew.
          deletedAt: bump(action.at, victim?.updatedAt)
        })
      };
    }
    case 'set-bodyweight': {
      const existing = data.bodyWeights.find((b) => b.date === action.date);
      const rest = data.bodyWeights.filter((b) => b.date !== action.date);
      if (action.weightKg == null) {
        return {
          ...data,
          bodyWeights: rest,
          tombstones: withTombstone(data.tombstones, {
            type: 'bodyweight',
            key: action.date,
            deletedAt: bump(action.at, existing?.updatedAt)
          })
        };
      }
      const stamped = bump(
        action.at,
        Math.max(existing?.updatedAt ?? 0, tombFor(data.tombstones, 'bodyweight', action.date))
      );
      return {
        ...data,
        bodyWeights: [...rest, { date: action.date, weightKg: action.weightKg, updatedAt: stamped }]
      };
    }
    case 'set-units':
      return {
        ...data,
        settings: { ...data.settings, units: action.units },
        settingsUpdatedAt: bump(action.at, data.settingsUpdatedAt)
      };
    case 'add-custom-exercise': {
      // Re-creating an existing id (e.g. a legacy lift by name) is a no-op.
      if (data.customExercises.some((e) => e.id === action.id)) return data;
      const stamped = bump(action.at, tombFor(data.tombstones, 'exercise', action.id));
      return {
        ...data,
        customExercises: [
          ...data.customExercises,
          {
            id: action.id,
            name: action.name,
            isCustom: true,
            tags: action.tags,
            createdAt: stamped,
            updatedAt: stamped
          }
        ]
      };
    }
    case 'update-exercise':
      return {
        ...data,
        customExercises: data.customExercises.map((e) =>
          e.id === action.id
            ? {
                ...e,
                name: action.name,
                tags: action.tags,
                updatedAt: bump(action.at, Math.max(e.updatedAt ?? 0, e.createdAt ?? 0))
              }
            : e
        )
      };
    case 'remove-custom-exercise': {
      const victim = data.customExercises.find((e) => e.id === action.id);
      return {
        ...data,
        customExercises: data.customExercises.filter((e) => e.id !== action.id),
        tombstones: withTombstone(data.tombstones, {
          type: 'exercise',
          key: action.id,
          deletedAt: bump(action.at, Math.max(victim?.updatedAt ?? 0, victim?.createdAt ?? 0))
        })
      };
    }
    case 'save-template': {
      const existing = data.templates.find((t) => t.id === action.id);
      const stamped = bump(
        action.at,
        Math.max(existing?.updatedAt ?? 0, tombFor(data.tombstones, 'template', action.id))
      );
      const tpl = { id: action.id, name: action.name, exerciseIds: action.exerciseIds, updatedAt: stamped };
      return {
        ...data,
        templates: existing
          ? data.templates.map((t) => (t.id === action.id ? tpl : t))
          : [...data.templates, tpl]
      };
    }
    case 'delete-template': {
      const victim = data.templates.find((t) => t.id === action.id);
      return {
        ...data,
        templates: data.templates.filter((t) => t.id !== action.id),
        tombstones: withTombstone(data.tombstones, {
          type: 'template',
          key: action.id,
          deletedAt: bump(action.at, victim?.updatedAt)
        })
      };
    }
    case 'set-exercise-hidden': {
      const existing = data.hiddenExercises.find((h) => h.id === action.id);
      const entry = {
        id: action.id,
        hidden: action.hidden,
        updatedAt: bump(action.at, existing?.updatedAt)
      };
      const rest = data.hiddenExercises.filter((h) => h.id !== action.id);
      return { ...data, hiddenExercises: [...rest, entry] };
    }
    case 'apply-template':
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => {
          const present = new Set(s.blocks.map((b) => b.exerciseId));
          const additions = action.blocks
            .filter((b) => !present.has(b.exerciseId))
            .map((b) => ({ id: b.blockId, exerciseId: b.exerciseId, sets: [] }));
          return { ...s, blocks: [...s.blocks, ...additions] };
        })
      };
    case 'add-cardio':
      return {
        ...data,
        sessions: upsertSession(data, action.date, action.at, (s) => ({
          ...s,
          cardio: [
            ...s.cardio,
            {
              id: action.cardioId,
              durationMin: action.durationMin,
              speedKmh: action.speedKmh,
              inclinePct: action.inclinePct
            }
          ]
        }))
      };
    case 'remove-cardio': {
      const sessions = data.sessions
        .map((s) =>
          s.date === action.date
            ? {
                ...s,
                cardio: s.cardio.filter((c) => c.id !== action.cardioId),
                updatedAt: bump(action.at, s.updatedAt)
              }
            : s
        )
        .filter((s) => s.blocks.length > 0 || s.cardio.length > 0);
      return { ...data, sessions };
    }
    case 'set-profile':
      return { ...data, profile: action.profile, profileUpdatedAt: bump(action.at, data.profileUpdatedAt) };
    case 'import-data':
      return action.data;
    case 'merge-remote':
      // The merge happens here, against the true current state, so edits or
      // deletions made while a sync was in flight can never be clobbered by
      // a stale snapshot.
      return mergeData(data, action.remote);
    case 'clear-all':
      return defaultData();
  }
}

/** Exported for tests. */
export { reducer as _reducer };

const AppContext = createContext<{ data: AppData; dispatch: Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const value = useMemo(() => ({ data, dispatch }), [data]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function uid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Action helpers; ids and timestamps are generated here so the reducer stays pure. */
export function useActions() {
  const { dispatch } = useApp();
  return useMemo(
    () => ({
      addBlock: (date: string, exerciseId: string) =>
        dispatch({ type: 'add-block', date, blockId: uid(), exerciseId, at: Date.now() }),
      removeBlock: (date: string, blockId: string) =>
        dispatch({ type: 'remove-block', date, blockId, at: Date.now() }),
      addSet: (date: string, blockId: string, set: { weightKg: number; reps: number; rpe: number | null }) =>
        dispatch({ type: 'add-set', date, blockId, setId: uid(), ...set, at: Date.now() }),
      updateSet: (
        date: string,
        blockId: string,
        setId: string,
        set: { weightKg: number; reps: number; rpe: number | null }
      ) => dispatch({ type: 'update-set', date, blockId, setId, ...set, at: Date.now() }),
      removeSet: (date: string, blockId: string, setId: string) =>
        dispatch({ type: 'remove-set', date, blockId, setId, at: Date.now() }),
      deleteSession: (date: string) => dispatch({ type: 'delete-session', date, at: Date.now() }),
      setBodyWeight: (date: string, weightKg: number | null) =>
        dispatch({ type: 'set-bodyweight', date, weightKg, at: Date.now() }),
      setUnits: (units: Units) => dispatch({ type: 'set-units', units, at: Date.now() }),
      addCustomExercise: (name: string, tags: string[] = []): string => {
        // Reuse the legacy id when the name matches, so old history reconnects.
        const id = builtinIdForName(name) ?? `custom-${uid()}`;
        dispatch({ type: 'add-custom-exercise', id, name: name.trim(), tags, at: Date.now() });
        // Creating a lift always means the user wants it visible again.
        dispatch({ type: 'set-exercise-hidden', id, hidden: false, at: Date.now() });
        return id;
      },
      updateExercise: (id: string, name: string, tags: string[]) =>
        dispatch({ type: 'update-exercise', id, name, tags, at: Date.now() }),
      removeCustomExercise: (id: string) =>
        dispatch({ type: 'remove-custom-exercise', id, at: Date.now() }),
      saveTemplate: (name: string, exerciseIds: string[], id?: string): string => {
        const tplId = id ?? `tpl-${uid()}`;
        dispatch({ type: 'save-template', id: tplId, name, exerciseIds, at: Date.now() });
        return tplId;
      },
      deleteTemplate: (id: string) => dispatch({ type: 'delete-template', id, at: Date.now() }),
      setExerciseHidden: (id: string, hidden: boolean) =>
        dispatch({ type: 'set-exercise-hidden', id, hidden, at: Date.now() }),
      applyTemplate: (date: string, exerciseIds: string[]) =>
        dispatch({
          type: 'apply-template',
          date,
          blocks: exerciseIds.map((exerciseId) => ({ blockId: uid(), exerciseId })),
          at: Date.now()
        }),
      addCardio: (date: string, entry: { durationMin: number; speedKmh: number; inclinePct: number }) =>
        dispatch({ type: 'add-cardio', date, cardioId: uid(), ...entry, at: Date.now() }),
      removeCardio: (date: string, cardioId: string) =>
        dispatch({ type: 'remove-cardio', date, cardioId, at: Date.now() }),
      setProfile: (profile: Profile) => dispatch({ type: 'set-profile', profile, at: Date.now() }),
      importData: (data: AppData) => dispatch({ type: 'import-data', data }),
      mergeRemote: (remote: AppData) => dispatch({ type: 'merge-remote', remote }),
      clearAll: () => dispatch({ type: 'clear-all' })
    }),
    [dispatch]
  );
}
