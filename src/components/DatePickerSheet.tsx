import { useMemo, useState } from 'react';
import { parseISODate, toISODate, todayISO } from '../lib/dates';
import { useApp } from '../lib/store';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * In-app calendar picker. Replaces hidden native date inputs, which
 * installed iOS web apps open unreliably. Days with logged workouts get a dot.
 */
export default function DatePickerSheet({
  initial,
  maxDate,
  onPick,
  onClose
}: {
  initial: string;
  maxDate?: string;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const { data } = useApp();
  const init = parseISODate(initial);
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  const sessionDates = useMemo(() => new Set(data.sessions.map((s) => s.date)), [data.sessions]);
  const today = todayISO();

  function nav(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<string | null> = [
    ...(Array(startOffset).fill(null) as null[]),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(viewYear, viewMonth, i + 1)))
  ];
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Pick a day</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => nav(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className="cal-title">{title}</span>
          <button type="button" className="icon-btn" onClick={() => nav(1)} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="cal-grid cal-week">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="cal-weekday">
              {w}
            </span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((iso, i) =>
            iso == null ? (
              <span key={`blank-${i}`} />
            ) : (
              <button
                key={iso}
                type="button"
                disabled={maxDate != null && iso > maxDate}
                className={`cal-cell${iso === today ? ' today' : ''}${iso === initial ? ' selected' : ''}`}
                onClick={() => onPick(iso)}
              >
                {Number(iso.slice(8))}
                {sessionDates.has(iso) && <span className="cal-dot" />}
              </button>
            )
          )}
        </div>

        <button type="button" className="btn ghost block" onClick={() => onPick(today)}>
          Jump to today
        </button>
      </div>
    </div>
  );
}
