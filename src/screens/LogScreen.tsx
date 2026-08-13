import { useState } from 'react';
import { formatLongDate, todayISO } from '../lib/dates';
import { useApp } from '../lib/store';
import { formatTonnage } from '../lib/units';
import BodyWeightCard from '../components/BodyWeightCard';
import CardioCard from '../components/CardioCard';
import OneRmCalculatorSheet from '../components/OneRmCalculatorSheet';
import SessionEditor from '../components/SessionEditor';

export default function LogScreen() {
  const { data } = useApp();
  const units = data.settings.units;
  const today = todayISO();
  const [calcOpen, setCalcOpen] = useState(false);

  const session = data.sessions.find((s) => s.date === today);
  const setCount = session?.blocks.reduce((n, b) => n + b.sets.length, 0) ?? 0;
  const tonnageKg =
    session?.blocks.reduce((t, b) => t + b.sets.reduce((x, s) => x + s.weightKg * s.reps, 0), 0) ?? 0;

  return (
    <div className="screen">
      <header className="screen-header with-action">
        <div>
          <h1>Log</h1>
          <div className="sub">
            {formatLongDate(today)}
            {setCount > 0 && (
              <>
                {' '}
                · {setCount} sets · {formatTonnage(tonnageKg, units)}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn calc-btn"
          onClick={() => setCalcOpen(true)}
          aria-label="Open % of 1RM calculator"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
            <path d="M8.5 6.5h7" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18.5h.01M12 18.5h.01M15.5 18.5h.01" />
          </svg>
        </button>
      </header>
      <div className="stack">
        <BodyWeightCard date={today} />
        <SessionEditor date={today} />
        <CardioCard date={today} />
      </div>
      {calcOpen && <OneRmCalculatorSheet onClose={() => setCalcOpen(false)} />}
    </div>
  );
}
