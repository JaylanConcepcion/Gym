import type { AppData, Profile } from './types';

export const KMH_PER_MPH = 1.609344;
export const CM_PER_IN = 2.54;

/**
 * Treadmill calorie estimate based on the ACSM metabolic equations.
 *
 * VO2 (mL O2 / kg / min):
 *   walking: 3.5 + 0.1·v + 1.8·v·grade      (v in m/min, grade as fraction)
 *   running: 3.5 + 0.2·v + 0.9·v·grade
 * Blended between 3.7 and 5.0 mph so the walk→run transition is smooth.
 *
 * When height/age are known, the generic 3.5 resting term is replaced by the
 * person's own resting VO2 derived from Mifflin-St Jeor BMR — that's where
 * height, age, and sex sharpen the estimate. 1 L O2 ≈ 5 kcal.
 */
export function treadmillCalories(opts: {
  speedKmh: number;
  inclinePct: number;
  durationMin: number;
  weightKg: number;
  profile?: Profile;
}): number {
  const { speedKmh, inclinePct, durationMin, weightKg, profile } = opts;
  if (speedKmh <= 0 || durationMin <= 0 || weightKg <= 0) return 0;

  const mPerMin = (speedKmh * 1000) / 60;
  const grade = inclinePct / 100;
  const walk = 3.5 + 0.1 * mPerMin + 1.8 * mPerMin * grade;
  const run = 3.5 + 0.2 * mPerMin + 0.9 * mPerMin * grade;
  const mph = speedKmh / KMH_PER_MPH;
  const t = Math.min(1, Math.max(0, (mph - 3.7) / 1.3));
  let vo2 = walk + (run - walk) * t;

  if (profile && profile.heightCm && profile.age) {
    const sexTerm = profile.sex === 'm' ? 5 : profile.sex === 'f' ? -161 : -78;
    const bmr = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexTerm;
    const restingVo2 = (bmr / 1440 / 5) * (1000 / weightKg);
    vo2 = vo2 - 3.5 + restingVo2;
  }

  const kcalPerMin = (vo2 * weightKg * 5) / 1000;
  return Math.round(kcalPerMin * durationMin);
}

/**
 * Bodyweight to use for a given day: the most recent weigh-in on or before it,
 * else the earliest weigh-in on record, else null (no estimate possible).
 */
export function bodyWeightKgForDate(data: AppData, date: string): number | null {
  const sorted = [...data.bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;
  let candidate = null;
  for (const e of sorted) {
    if (e.date <= date) candidate = e;
    else break;
  }
  return (candidate ?? sorted[0]).weightKg;
}

export function sessionCardioCalories(
  data: AppData,
  session: { date: string; cardio: Array<{ speedKmh: number; inclinePct: number; durationMin: number }> }
): number | null {
  if (session.cardio.length === 0) return 0;
  const weightKg = bodyWeightKgForDate(data, session.date);
  if (weightKg == null) return null;
  return session.cardio.reduce(
    (sum, c) =>
      sum +
      treadmillCalories({
        speedKmh: c.speedKmh,
        inclinePct: c.inclinePct,
        durationMin: c.durationMin,
        weightKg,
        profile: data.profile
      }),
    0
  );
}
