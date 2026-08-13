import type { AppData, ExerciseDef } from './types';

/**
 * No presets are offered anymore — the user builds their own list. This table
 * remains for two jobs: resolving names of legacy logged data, and reusing a
 * stable id when the user re-creates one of these by name (so old history
 * reconnects to the new entry).
 */
export const BUILT_IN_EXERCISES: ExerciseDef[] = [
  { id: 'squat', name: 'Squat' },
  { id: 'bench', name: 'Bench Press' },
  { id: 'deadlift', name: 'Deadlift' },
  { id: 'ohp', name: 'Overhead Press' },
  { id: 'pause-bench', name: 'Pause Bench' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench' },
  { id: 'incline-bench', name: 'Incline Bench' },
  { id: 'front-squat', name: 'Front Squat' },
  { id: 'pause-squat', name: 'Pause Squat' },
  { id: 'high-bar-squat', name: 'High-Bar Squat' },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift' },
  { id: 'deficit-deadlift', name: 'Deficit Deadlift' },
  { id: 'paused-deadlift', name: 'Paused Deadlift' },
  { id: 'rdl', name: 'Romanian Deadlift' },
  { id: 'barbell-row', name: 'Barbell Row' }
];

export const BIG3 = ['squat', 'bench', 'deadlift'];

export function exerciseName(data: AppData, id: string): string {
  return (
    data.customExercises.find((e) => e.id === id)?.name ??
    BUILT_IN_EXERCISES.find((e) => e.id === id)?.name ??
    'Unknown exercise'
  );
}

/** Stable id to reuse when the user creates a lift matching a legacy name. */
export function builtinIdForName(name: string): string | null {
  const n = name.trim().toLowerCase();
  return BUILT_IN_EXERCISES.find((e) => e.name.toLowerCase() === n)?.id ?? null;
}

export function hiddenExerciseIds(data: AppData): Set<string> {
  return new Set(data.hiddenExercises.filter((h) => h.hidden).map((h) => h.id));
}

/** Exercises offered by the picker: the user's own list, minus hidden ones. */
export function visibleExercises(data: AppData): ExerciseDef[] {
  const hidden = hiddenExerciseIds(data);
  return data.customExercises.filter((e) => !hidden.has(e.id));
}

/** Chart accent color keyed off the lift family. */
export function colorForExercise(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('squat')) return '#ef4444';
  if (n.includes('bench') || n.includes('press')) return '#38bdf8';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('pull')) return '#f43f5e';
  return '#a78bfa';
}
