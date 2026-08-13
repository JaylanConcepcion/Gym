export type Units = 'lb' | 'kg';

export interface ExerciseDef {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  /** Weights are always stored in kg; converted at the UI edges. */
  weightKg: number;
  reps: number;
  /** 6–10 in 0.5 steps, or null when not rated. */
  rpe: number | null;
}

export interface ExerciseBlock {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Session {
  id: string;
  /** Local date, YYYY-MM-DD. One session per day. */
  date: string;
  blocks: ExerciseBlock[];
}

export interface BodyWeightEntry {
  date: string;
  weightKg: number;
}

export interface Settings {
  units: Units;
}

export interface AppData {
  version: 1;
  settings: Settings;
  customExercises: ExerciseDef[];
  sessions: Session[];
  bodyWeights: BodyWeightEntry[];
}
