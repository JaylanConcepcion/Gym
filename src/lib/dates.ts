export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Today's local date (not UTC). */
export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing the given date. */
export function weekStartISO(dateStr: string): string {
  const d = parseISODate(dateStr);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function formatShortDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

export function formatRelativeTime(msEpoch: number): string {
  const diff = Date.now() - msEpoch;
  if (diff < 30_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'moments ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(msEpoch).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatLongDate(dateStr: string): string {
  const d = parseISODate(dateStr);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' as const })
  });
}
