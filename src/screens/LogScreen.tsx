import { formatLongDate, todayISO } from '../lib/dates';
import { useApp } from '../lib/store';
import { formatTonnage } from '../lib/units';
import BodyWeightCard from '../components/BodyWeightCard';
import CardioCard from '../components/CardioCard';
import SessionEditor from '../components/SessionEditor';

export default function LogScreen() {
  const { data } = useApp();
  const units = data.settings.units;
  const today = todayISO();

  const session = data.sessions.find((s) => s.date === today);
  const setCount = session?.blocks.reduce((n, b) => n + b.sets.length, 0) ?? 0;
  const tonnageKg =
    session?.blocks.reduce((t, b) => t + b.sets.reduce((x, s) => x + s.weightKg * s.reps, 0), 0) ?? 0;

  return (
    <div className="screen">
      <header className="screen-header">
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
      </header>
      <div className="stack">
        <BodyWeightCard date={today} />
        <SessionEditor date={today} />
        <CardioCard date={today} />
      </div>
    </div>
  );
}
