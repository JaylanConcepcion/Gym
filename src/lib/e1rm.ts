/**
 * RPE-aware estimated 1RM, the way powerlifters actually compute it.
 *
 * A set's difficulty collapses to a single number n = "reps to failure":
 *   n = reps + (10 - RPE)
 * e.g. 5 reps @ RPE 8 means 2 reps were left in the tank, so n = 7.
 *
 * The percentage of 1RM for each n comes from the standard RTS-style RPE
 * chart (its diagonals are constant, so a single table indexed by n covers
 * every reps/RPE combination). Half-RPE steps land exactly on table entries;
 * anything in between is linearly interpolated.
 */
const PCT_BY_REPS_TO_FAILURE: Array<[n: number, pct: number]> = [
  [1, 100],
  [1.5, 97.8],
  [2, 95.5],
  [2.5, 93.9],
  [3, 92.2],
  [3.5, 90.7],
  [4, 89.2],
  [4.5, 87.8],
  [5, 86.3],
  [5.5, 85.0],
  [6, 83.7],
  [6.5, 82.4],
  [7, 81.1],
  [7.5, 79.9],
  [8, 78.6],
  [8.5, 77.4],
  [9, 76.2],
  [9.5, 75.1],
  [10, 73.9],
  [10.5, 72.3],
  [11, 70.7],
  [11.5, 69.4],
  [12, 68.0]
];

const TABLE_MAX_N = 12;
const TABLE_MIN_PCT = 68.0;

/** % of 1RM a lifter can handle for n reps to failure. */
export function percentOfMax(n: number): number {
  if (n <= 1) return 100;
  if (n >= TABLE_MAX_N) {
    // Epley tail anchored at the table edge so the curve stays continuous
    // and monotonic past 12 effective reps.
    return (TABLE_MIN_PCT * (1 + TABLE_MAX_N / 30)) / (1 + n / 30);
  }
  for (let i = 0; i < PCT_BY_REPS_TO_FAILURE.length - 1; i++) {
    const [n0, p0] = PCT_BY_REPS_TO_FAILURE[i];
    const [n1, p1] = PCT_BY_REPS_TO_FAILURE[i + 1];
    if (n >= n0 && n <= n1) {
      const t = (n - n0) / (n1 - n0);
      return p0 + (p1 - p0) * t;
    }
  }
  return TABLE_MIN_PCT;
}

export function repsToFailure(reps: number, rpe: number | null): number {
  // Unrated sets are treated as RPE 10 (a conservative estimate).
  const effective = rpe == null ? 10 : Math.min(10, Math.max(4, rpe));
  return reps + (10 - effective);
}

/** Estimated 1RM in the same unit as `weight`. Returns 0 for invalid input. */
export function estimate1RM(weight: number, reps: number, rpe: number | null): number {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps < 1) return 0;
  return weight * (100 / percentOfMax(repsToFailure(reps, rpe)));
}
