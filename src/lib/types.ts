export type Units = 'lb' | 'kg';

export interface ExerciseDef {
  id: string;
  name: string;
  isCustom?: boolean;
  /** User labels like "legs" or "comp lift"; drives filtering in the bank. */
  tags?: string[];
  /** ms epoch; used to resolve deletes vs re-creates across devices. */
  createdAt?: number;
  /** ms epoch of the last edit (e.g. tag changes); drives cross-device merge. */
  updatedAt?: number;
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

export interface CardioEntry {
  id: string;
  durationMin: number;
  /** Stored canonically in km/h; entered as mph or km/h depending on units. */
  speedKmh: number;
  inclinePct: number;
}

export interface Session {
  id: string;
  /** Local date, YYYY-MM-DD. One session per day. */
  date: string;
  blocks: ExerciseBlock[];
  cardio: CardioEntry[];
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
  type: 'session' | 'bodyweight' | 'exercise' | 'template';
  /** Session/bodyweight: date. Exercise/template: id. */
  key: string;
  deletedAt: number;
}

/** A reusable "lifting day": one tap adds all of its exercises to the log. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
  updatedAt: number;
}

/** Per-exercise picker visibility (lets presets be hidden without losing history). */
export interface ExerciseVisibility {
  id: string;
  hidden: boolean;
  updatedAt: number;
}

export interface Settings {
  units: Units;
}

/** Personal info used (with logged bodyweight) for cardio calorie estimates. */
export interface Profile {
  heightCm: number | null;
  age: number | null;
  sex: 'm' | 'f' | null;
}

export interface AppData {
  version: 2;
  settings: Settings;
  settingsUpdatedAt: number;
  customExercises: ExerciseDef[];
  sessions: Session[];
  bodyWeights: BodyWeightEntry[];
  tombstones: Tombstone[];
  templates: WorkoutTemplate[];
  hiddenExercises: ExerciseVisibility[];
  profile: Profile;
  profileUpdatedAt: number;
}
