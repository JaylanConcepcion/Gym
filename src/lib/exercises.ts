import type { AppData, ExerciseDef } from './types';

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

export function getAllExercises(data: AppData): ExerciseDef[] {
  return [...BUILT_IN_EXERCISES, ...data.customExercises];
}

export function exerciseName(data: AppData, id: string): string {
  return getAllExercises(data).find((e) => e.id === id)?.name ?? 'Unknown exercise';
}

/** Chart accent color keyed off the lift family. */
export function colorForExercise(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('squat')) return '#f97316';
  if (n.includes('bench') || n.includes('press')) return '#38bdf8';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('pull')) return '#f43f5e';
  return '#a78bfa';
}
