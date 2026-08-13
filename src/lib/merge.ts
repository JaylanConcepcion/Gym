import type {
  AppData,
  BodyWeightEntry,
  ExerciseDef,
  ExerciseVisibility,
  Session,
  Tombstone,
  WorkoutTemplate
} from './types';

/**
 * Two-device merge. Granularity is deliberately per-day (per-session):
 * whichever device edited a given day most recently owns that whole day.
 * Deletions propagate via tombstones (a delete beats an older edit; an edit
 * beats an older delete).
 */

function sessionWeight(s: Session): number {
  return s.blocks.reduce((n, b) => n + b.sets.length, 0);
}

function newerSession(a: Session, b: Session): Session {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  const wa = sessionWeight(a);
  const wb = sessionWeight(b);
  if (wa !== wb) return wa > wb ? a : b;
  // Deterministic final tie-break so both devices converge on the same pick.
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

function mergeTombstones(a: Tombstone[], b: Tombstone[]): Map<string, Tombstone> {
  const map = new Map<string, Tombstone>();
  for (const t of [...a, ...b]) {
    const key = `${t.type}:${t.key}`;
    const cur = map.get(key);
    if (!cur || t.deletedAt > cur.deletedAt) map.set(key, t);
  }
  return map;
}

export function mergeData(local: AppData, remote: AppData): AppData {
  const tombs = mergeTombstones(local.tombstones, remote.tombstones);

  const sessionsByDate = new Map<string, Session>();
  for (const s of [...local.sessions, ...remote.sessions]) {
    const cur = sessionsByDate.get(s.date);
    sessionsByDate.set(s.date, cur ? newerSession(cur, s) : s);
  }
  const sessions = [...sessionsByDate.values()]
    .filter((s) => {
      const t = tombs.get(`session:${s.date}`);
      return !t || s.updatedAt > t.deletedAt;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const bwByDate = new Map<string, BodyWeightEntry>();
  for (const e of [...local.bodyWeights, ...remote.bodyWeights]) {
    const cur = bwByDate.get(e.date);
    if (!cur || e.updatedAt > cur.updatedAt) bwByDate.set(e.date, e);
  }
  const bodyWeights = [...bwByDate.values()]
    .filter((e) => {
      const t = tombs.get(`bodyweight:${e.date}`);
      return !t || e.updatedAt > t.deletedAt;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const exStamp = (e: ExerciseDef) => Math.max(e.updatedAt ?? 0, e.createdAt ?? 0);
  const exById = new Map<string, ExerciseDef>();
  for (const e of [...local.customExercises, ...remote.customExercises]) {
    const cur = exById.get(e.id);
    if (!cur || exStamp(e) > exStamp(cur)) exById.set(e.id, e);
  }
  const customExercises = [...exById.values()]
    .filter((e) => {
      const t = tombs.get(`exercise:${e.id}`);
      return !t || exStamp(e) > t.deletedAt;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const tplById = new Map<string, WorkoutTemplate>();
  for (const t of [...local.templates, ...remote.templates]) {
    const cur = tplById.get(t.id);
    if (!cur || t.updatedAt > cur.updatedAt) tplById.set(t.id, t);
  }
  const templates = [...tplById.values()]
    .filter((t) => {
      const tomb = tombs.get(`template:${t.id}`);
      return !tomb || t.updatedAt > tomb.deletedAt;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const visById = new Map<string, ExerciseVisibility>();
  for (const h of [...local.hiddenExercises, ...remote.hiddenExercises]) {
    const cur = visById.get(h.id);
    if (!cur || h.updatedAt > cur.updatedAt) visById.set(h.id, h);
  }
  const hiddenExercises = [...visById.values()].sort((a, b) => a.id.localeCompare(b.id));

  const settingsFrom = remote.settingsUpdatedAt > local.settingsUpdatedAt ? remote : local;

  return {
    version: 2,
    settings: { units: settingsFrom.settings.units },
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    customExercises,
    sessions,
    bodyWeights,
    tombstones: [...tombs.values()].sort((a, b) => `${a.type}:${a.key}`.localeCompare(`${b.type}:${b.key}`)),
    templates,
    hiddenExercises
  };
}

/** Stable serialization so "did anything actually change" is a string compare. */
export function canonicalize(data: AppData): string {
  return JSON.stringify({
    version: data.version,
    settings: { units: data.settings.units },
    settingsUpdatedAt: data.settingsUpdatedAt,
    customExercises: [...data.customExercises].sort((a, b) => a.id.localeCompare(b.id)),
    sessions: [...data.sessions].sort((a, b) => a.date.localeCompare(b.date)),
    bodyWeights: [...data.bodyWeights].sort((a, b) => a.date.localeCompare(b.date)),
    tombstones: [...data.tombstones].sort((a, b) =>
      `${a.type}:${a.key}`.localeCompare(`${b.type}:${b.key}`)
    ),
    templates: [...data.templates].sort((a, b) => a.id.localeCompare(b.id)),
    hiddenExercises: [...data.hiddenExercises].sort((a, b) => a.id.localeCompare(b.id))
  });
}
