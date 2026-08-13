import { estimate1RM } from './e1rm';
import { BIG3 } from './exercises';
import { parseISODate, weekStartISO } from './dates';
import type { AppData } from './types';

export interface LoggedSet {
  date: string;
  exerciseId: string;
  setId: string;
  weightKg: number;
  reps: number;
  rpe: number | null;
  e1rmKg: number;
}

export function allLoggedSets(data: AppData): LoggedSet[] {
  const out: LoggedSet[] = [];
  for (const session of data.sessions) {
    for (const block of session.blocks) {
      for (const set of block.sets) {
        out.push({
          date: session.date,
          exerciseId: block.exerciseId,
          setId: set.id,
          weightKg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe,
          e1rmKg: estimate1RM(set.weightKg, set.reps, set.rpe)
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Exercise ids that have logged sets: big 3 first, then by set count. */
export function exercisesWithData(data: AppData): string[] {
  const counts = new Map<string, number>();
  for (const s of allLoggedSets(data)) {
    counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
  }
  return [...counts.keys()].sort((a, b) => {
    const ai = BIG3.indexOf(a);
    const bi = BIG3.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
  });
}

export type Period = 'day' | 'week' | 'month';

/** Bucket key for a date at the requested granularity (week = Monday start). */
export function periodKey(dateStr: string, period: Period): string {
  if (period === 'day') return dateStr;
  if (period === 'week') return weekStartISO(dateStr);
  return `${dateStr.slice(0, 7)}-01`;
}

/** Best e1RM per day/week/month. The progression trend line. */
export function bestE1rmByPeriod(
  data: AppData,
  exerciseId: string,
  period: Period
): Array<{ key: string; e1rmKg: number }> {
  const byKey = new Map<string, number>();
  for (const s of allLoggedSets(data)) {
    if (s.exerciseId !== exerciseId) continue;
    const k = periodKey(s.date, period);
    const cur = byKey.get(k);
    if (cur == null || s.e1rmKg > cur) byKey.set(k, s.e1rmKg);
  }
  return [...byKey.entries()]
    .map(([key, e1rmKg]) => ({ key, e1rmKg }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Heaviest set of each session for an exercise. */
export function topSetByDate(data: AppData, exerciseId: string): LoggedSet[] {
  const byDate = new Map<string, LoggedSet>();
  for (const s of allLoggedSets(data)) {
    if (s.exerciseId !== exerciseId) continue;
    const cur = byDate.get(s.date);
    if (!cur || s.weightKg > cur.weightKg || (s.weightKg === cur.weightKg && s.reps > cur.reps)) {
      byDate.set(s.date, s);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function tonnageByPeriod(
  data: AppData,
  exerciseId: string,
  period: Period
): Array<{ key: string; tonnageKg: number; sets: number }> {
  const byKey = new Map<string, { tonnageKg: number; sets: number }>();
  for (const s of allLoggedSets(data)) {
    if (s.exerciseId !== exerciseId) continue;
    const k = periodKey(s.date, period);
    const cur = byKey.get(k) ?? { tonnageKg: 0, sets: 0 };
    cur.tonnageKg += s.weightKg * s.reps;
    cur.sets += 1;
    byKey.set(k, cur);
  }
  return [...byKey.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Body weight entries with a trailing 7-day rolling average. */
export function bodyWeightSeries(
  data: AppData
): Array<{ date: string; weightKg: number; avgKg: number }> {
  const entries = [...data.bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
  const DAY = 86_400_000;
  return entries.map((e) => {
    const t = parseISODate(e.date).getTime();
    const window = entries.filter((x) => {
      const xt = parseISODate(x.date).getTime();
      return xt <= t && xt > t - 7 * DAY;
    });
    const avgKg = window.reduce((sum, x) => sum + x.weightKg, 0) / window.length;
    return { date: e.date, weightKg: e.weightKg, avgKg };
  });
}

export interface PrRecords {
  bestSingle: LoggedSet | null;
  bestE1rm: LoggedSet | null;
  /** Heaviest weight ever lifted for exactly 1..10 reps, ascending by reps. */
  repPRs: LoggedSet[];
}

export function prRecords(data: AppData, exerciseId: string): PrRecords {
  let bestSingle: LoggedSet | null = null;
  let bestE1rm: LoggedSet | null = null;
  const byReps = new Map<number, LoggedSet>();
  for (const s of allLoggedSets(data)) {
    if (s.exerciseId !== exerciseId) continue;
    if (s.reps === 1 && (!bestSingle || s.weightKg > bestSingle.weightKg)) bestSingle = s;
    if (!bestE1rm || s.e1rmKg > bestE1rm.e1rmKg) bestE1rm = s;
    if (s.reps >= 1 && s.reps <= 10) {
      const cur = byReps.get(s.reps);
      if (!cur || s.weightKg > cur.weightKg) byReps.set(s.reps, s);
    }
  }
  const repPRs = [...byReps.values()].sort((a, b) => a.reps - b.reps);
  return { bestSingle, bestE1rm, repPRs };
}
