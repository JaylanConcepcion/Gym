import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode
} from 'react';
import { defaultData, loadData, saveData } from './storage';
import type { AppData, Session, Tombstone, Units } from './types';

type Action =
  | { type: 'add-block'; date: string; blockId: string; exerciseId: string; at: number }
  | { type: 'remove-block'; date: string; blockId: string; at: number }
  | { type: 'add-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null; at: number }
  | { type: 'update-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null; at: number }
  | { type: 'remove-set'; date: string; blockId: string; setId: string; at: number }
  | { type: 'delete-session'; date: string; at: number }
  | { type: 'set-bodyweight'; date: string; weightKg: number | null; at: number }
  | { type: 'set-units'; units: Units; at: number }
  | { type: 'add-custom-exercise'; id: string; name: string; at: number }
  | { type: 'remove-custom-exercise'; id: string; at: number }
  | { type: 'save-template'; id: string; name: string; exerciseIds: string[]; at: number }
  | { type: 'delete-template'; id: string; at: number }
  | { type: 'set-exercise-hidden'; id: string; hidden: boolean; at: number }
  | { type: 'apply-template'; date: string; blocks: Array<{ blockId: string; exerciseId: string }>; at: number }
  | { type: 'import-data'; data: AppData }
  | { type: 'apply-synced'; data: AppData }
  | { type: 'clear-all' };

function withTombstone(tombstones: Tombstone[], t: Tombstone): Tombstone[] {
  return [...tombstones.filter((x) => !(x.type === t.type && x.key === t.key)), t];
}

function upsertSession(
  sessions: Session[],
  date: string,
  at: number,
  fn: (s: Session) => Session
): Session[] {
  if (sessions.some((s) => s.date === date)) {
    return sessions.map((s) => (s.date === date ? { ...fn(s), updatedAt: at } : s));
  }
  return [...sessions, { ...fn({ id: `session-${date}`, date, blocks: [], updatedAt: at }), updatedAt: at }];
}

function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'add-block':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, action.at, (s) => ({
          ...s,
          blocks: [...s.blocks, { id: action.blockId, exerciseId: action.exerciseId, sets: [] }]
        }))
      };
    case 'remove-block': {
      const sessions = data.sessions
        .map((s) =>
          s.date === action.date
            ? { ...s, blocks: s.blocks.filter((b) => b.id !== action.blockId), updatedAt: action.at }
            : s
        )
        .filter((s) => s.blocks.length > 0);
      return { ...data, sessions };
    }
    case 'add-set':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, action.at, (s) => ({
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
    case 'update-set':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, action.at, (s) => ({
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
    case 'remove-set':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, action.at, (s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id !== action.blockId ? b : { ...b, sets: b.sets.filter((set) => set.id !== action.setId) }
          )
        }))
      };
    case 'delete-session':
      return {
        ...data,
        sessions: data.sessions.filter((s) => s.date !== action.date),
        tombstones: withTombstone(data.tombstones, {
          type: 'session',
          key: action.date,
          deletedAt: action.at
        })
      };
    case 'set-bodyweight': {
      const rest = data.bodyWeights.filter((b) => b.date !== action.date);
      if (action.weightKg == null) {
        return {
          ...data,
          bodyWeights: rest,
          tombstones: withTombstone(data.tombstones, {
            type: 'bodyweight',
            key: action.date,
            deletedAt: action.at
          })
        };
      }
      return {
        ...data,
        bodyWeights: [...rest, { date: action.date, weightKg: action.weightKg, updatedAt: action.at }]
      };
    }
    case 'set-units':
      return {
        ...data,
        settings: { ...data.settings, units: action.units },
        settingsUpdatedAt: action.at
      };
    case 'add-custom-exercise':
      return {
        ...data,
        customExercises: [
          ...data.customExercises,
          { id: action.id, name: action.name, isCustom: true, createdAt: action.at }
        ]
      };
    case 'remove-custom-exercise':
      return {
        ...data,
        customExercises: data.customExercises.filter((e) => e.id !== action.id),
        tombstones: withTombstone(data.tombstones, {
          type: 'exercise',
          key: action.id,
          deletedAt: action.at
        })
      };
    case 'save-template': {
      const tpl = { id: action.id, name: action.name, exerciseIds: action.exerciseIds, updatedAt: action.at };
      const exists = data.templates.some((t) => t.id === action.id);
      return {
        ...data,
        templates: exists
          ? data.templates.map((t) => (t.id === action.id ? tpl : t))
          : [...data.templates, tpl]
      };
    }
    case 'delete-template':
      return {
        ...data,
        templates: data.templates.filter((t) => t.id !== action.id),
        tombstones: withTombstone(data.tombstones, {
          type: 'template',
          key: action.id,
          deletedAt: action.at
        })
      };
    case 'set-exercise-hidden': {
      const entry = { id: action.id, hidden: action.hidden, updatedAt: action.at };
      const rest = data.hiddenExercises.filter((h) => h.id !== action.id);
      return { ...data, hiddenExercises: [...rest, entry] };
    }
    case 'apply-template':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, action.at, (s) => {
          const present = new Set(s.blocks.map((b) => b.exerciseId));
          const additions = action.blocks
            .filter((b) => !present.has(b.exerciseId))
            .map((b) => ({ id: b.blockId, exerciseId: b.exerciseId, sets: [] }));
          return { ...s, blocks: [...s.blocks, ...additions] };
        })
      };
    case 'import-data':
      return action.data;
    case 'apply-synced':
      return action.data;
    case 'clear-all':
      return defaultData();
  }
}

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
      addCustomExercise: (name: string): string => {
        const id = `custom-${uid()}`;
        dispatch({ type: 'add-custom-exercise', id, name, at: Date.now() });
        return id;
      },
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
      importData: (data: AppData) => dispatch({ type: 'import-data', data }),
      applySynced: (data: AppData) => dispatch({ type: 'apply-synced', data }),
      clearAll: () => dispatch({ type: 'clear-all' })
    }),
    [dispatch]
  );
}
