export type Units = 'lb' | 'kg';

export interface ExerciseDef {
  id: string;
  name: string;
  isCustom?: boolean;
  /** ms epoch; used to resolve deletes vs re-creates across devices. */
  createdAt?: number;
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
  /** ms epoch of the last edit; drives cross-device merge (newest wins per day). */
  updatedAt: number;
}

export interface BodyWeightEntry {
  date: string;
  weightKg: number;
  updatedAt: number;
}

/** Deletion marker so removals propagate across devices instead of resurrecting. */
export interface Tombstone {
  type: 'session' | 'bodyweight' | 'exercise';
  /** Session/bodyweight: date. Exercise: id. */
  key: string;
  deletedAt: number;
}

export interface Settings {
  units: Units;
}

export interface AppData {
  version: 2;
  settings: Settings;
  settingsUpdatedAt: number;
  customExercises: ExerciseDef[];
  sessions: Session[];
  bodyWeights: BodyWeightEntry[];
  tombstones: Tombstone[];
}
