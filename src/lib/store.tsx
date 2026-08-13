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
import type { AppData, Session, Units } from './types';

type Action =
  | { type: 'add-block'; date: string; blockId: string; exerciseId: string }
  | { type: 'remove-block'; date: string; blockId: string }
  | { type: 'add-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null }
  | { type: 'update-set'; date: string; blockId: string; setId: string; weightKg: number; reps: number; rpe: number | null }
  | { type: 'remove-set'; date: string; blockId: string; setId: string }
  | { type: 'delete-session'; date: string }
  | { type: 'set-bodyweight'; date: string; weightKg: number | null }
  | { type: 'set-units'; units: Units }
  | { type: 'add-custom-exercise'; id: string; name: string }
  | { type: 'remove-custom-exercise'; id: string }
  | { type: 'import-data'; data: AppData }
  | { type: 'clear-all' };

function upsertSession(sessions: Session[], date: string, fn: (s: Session) => Session): Session[] {
  if (sessions.some((s) => s.date === date)) {
    return sessions.map((s) => (s.date === date ? fn(s) : s));
  }
  return [...sessions, fn({ id: `session-${date}`, date, blocks: [] })];
}

function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'add-block':
      return {
        ...data,
        sessions: upsertSession(data.sessions, action.date, (s) => ({
          ...s,
          blocks: [...s.blocks, { id: action.blockId, exerciseId: action.exerciseId, sets: [] }]
        }))
      };
    case 'remove-block': {
      const sessions = data.sessions
        .map((s) =>
          s.date === action.date
            ? { ...s, blocks: s.blocks.filter((b) => b.id !== action.blockId) }
            : s
        )
        .filter((s) => s.blocks.length > 0);
      return { ...data, sessions };
    }
    case 'add-set':
      return {
        ...data,
        sessions: data.sessions.map((s) =>
          s.date !== action.date
            ? s
            : {
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
              }
        )
      };
    case 'update-set':
      return {
        ...data,
        sessions: data.sessions.map((s) =>
          s.date !== action.date
            ? s
            : {
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
              }
        )
      };
    case 'remove-set':
      return {
        ...data,
        sessions: data.sessions.map((s) =>
          s.date !== action.date
            ? s
            : {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id !== action.blockId ? b : { ...b, sets: b.sets.filter((set) => set.id !== action.setId) }
                )
              }
        )
      };
    case 'delete-session':
      return { ...data, sessions: data.sessions.filter((s) => s.date !== action.date) };
    case 'set-bodyweight': {
      const rest = data.bodyWeights.filter((b) => b.date !== action.date);
      return {
        ...data,
        bodyWeights:
          action.weightKg == null ? rest : [...rest, { date: action.date, weightKg: action.weightKg }]
      };
    }
    case 'set-units':
      return { ...data, settings: { ...data.settings, units: action.units } };
    case 'add-custom-exercise':
      return {
        ...data,
        customExercises: [...data.customExercises, { id: action.id, name: action.name, isCustom: true }]
      };
    case 'remove-custom-exercise':
      return { ...data, customExercises: data.customExercises.filter((e) => e.id !== action.id) };
    case 'import-data':
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

/** Action helpers; ids are generated here so the reducer stays pure. */
export function useActions() {
  const { dispatch } = useApp();
  return useMemo(
    () => ({
      addBlock: (date: string, exerciseId: string) =>
        dispatch({ type: 'add-block', date, blockId: uid(), exerciseId }),
      removeBlock: (date: string, blockId: string) => dispatch({ type: 'remove-block', date, blockId }),
      addSet: (date: string, blockId: string, set: { weightKg: number; reps: number; rpe: number | null }) =>
        dispatch({ type: 'add-set', date, blockId, setId: uid(), ...set }),
      updateSet: (
        date: string,
        blockId: string,
        setId: string,
        set: { weightKg: number; reps: number; rpe: number | null }
      ) => dispatch({ type: 'update-set', date, blockId, setId, ...set }),
      removeSet: (date: string, blockId: string, setId: string) =>
        dispatch({ type: 'remove-set', date, blockId, setId }),
      deleteSession: (date: string) => dispatch({ type: 'delete-session', date }),
      setBodyWeight: (date: string, weightKg: number | null) =>
        dispatch({ type: 'set-bodyweight', date, weightKg }),
      setUnits: (units: Units) => dispatch({ type: 'set-units', units }),
      addCustomExercise: (name: string): string => {
        const id = `custom-${uid()}`;
        dispatch({ type: 'add-custom-exercise', id, name });
        return id;
      },
      removeCustomExercise: (id: string) => dispatch({ type: 'remove-custom-exercise', id }),
      importData: (data: AppData) => dispatch({ type: 'import-data', data }),
      clearAll: () => dispatch({ type: 'clear-all' })
    }),
    [dispatch]
  );
}
