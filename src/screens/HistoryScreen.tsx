import { useState } from 'react';
import { formatLongDate, todayISO } from '../lib/dates';
import { exerciseName } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import { formatTonnage, formatWeightValue } from '../lib/units';
import BodyWeightCard from '../components/BodyWeightCard';
import CardioCard from '../components/CardioCard';
import ConfirmButton from '../components/ConfirmButton';
import DatePickerSheet from '../components/DatePickerSheet';
import SessionEditor from '../components/SessionEditor';
import { sessionCardioCalories } from '../lib/cardio';

export default function HistoryScreen() {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const [selected, setSelected] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  if (selected) {
    return (
      <div className="screen">
        <header className="screen-header">
          <button type="button" className="btn ghost small" onClick={() => setSelected(null)}>
            ‹ Back
          </button>
          <h1>{formatLongDate(selected)}</h1>
        </header>
        <div className="stack">
          <BodyWeightCard date={selected} />
          <SessionEditor date={selected} />
          <CardioCard date={selected} />
          <ConfirmButton
            className="btn ghost danger block"
            confirmLabel="Tap again to delete this session"
            onConfirm={() => {
              actions.deleteSession(selected);
              setSelected(null);
            }}
          >
            Delete session
          </ConfirmButton>
        </div>
      </div>
    );
  }

  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="screen">
      <header className="screen-header with-action">
        <h1>History</h1>
        <button type="button" className="btn ghost small" onClick={() => setDateOpen(true)}>
          + Log past day
        </button>
      </header>
      {dateOpen && (
        <DatePickerSheet
          initial={todayISO()}
          maxDate={todayISO()}
          onPick={(d) => {
            setSelected(d);
            setDateOpen(false);
          }}
          onClose={() => setDateOpen(false)}
        />
      )}
      {sessions.length === 0 ? (
        <div className="card empty">No sessions yet. Hit the gym and log your first one.</div>
      ) : (
        <div className="stack">
          {sessions.map((s) => {
            const tonnageKg = s.blocks.reduce(
              (t, b) => t + b.sets.reduce((x, st) => x + st.weightKg * st.reps, 0),
              0
            );
            const bw = data.bodyWeights.find((b) => b.date === s.date);
            return (
              <div
                key={s.date}
                role="button"
                tabIndex={0}
                className="card session-card"
                onClick={() => setSelected(s.date)}
              >
                <div className="session-head">
                  <strong>{formatLongDate(s.date)}</strong>
                  <span className="row" style={{ gap: 6 }}>
                    {bw && (
                      <span className="tag">
                        BW {formatWeightValue(bw.weightKg, units)} {units}
                      </span>
                    )}
                    <ConfirmButton
                      className="icon-btn small"
                      confirmLabel="Delete?"
                      ariaLabel={`Delete ${formatLongDate(s.date)}`}
                      onConfirm={() => actions.deleteSession(s.date)}
                    >
                      ✕
                    </ConfirmButton>
                  </span>
                </div>
                <div className="sub">
                  {s.blocks.map((b) => `${exerciseName(data, b.exerciseId)} · ${b.sets.length}×`).join('   ')}
                </div>
                {s.cardio.length > 0 && (
                  <div className="sub dim">
                    Cardio · {Math.round(s.cardio.reduce((n, c) => n + c.durationMin, 0))} min
                    {sessionCardioCalories(data, s) != null && <> · ≈{sessionCardioCalories(data, s)} kcal</>}
                  </div>
                )}
                <div className="sub dim">{formatTonnage(tonnageKg, units)} total</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
