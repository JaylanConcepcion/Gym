import { useState } from 'react';
import { bodyWeightKgForDate, KMH_PER_MPH, treadmillCalories } from '../lib/cardio';
import { useActions, useApp } from '../lib/store';
import { roundTo } from '../lib/units';

export default function CardioCard({ date }: { date: string }) {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const speedUnit = units === 'lb' ? 'mph' : 'km/h';

  const session = data.sessions.find((s) => s.date === date);
  const entries = session?.cardio ?? [];
  const weightKg = bodyWeightKgForDate(data, date);
  const profileIncomplete = !data.profile.heightCm || !data.profile.age;

  const [durStr, setDurStr] = useState('');
  const [speedStr, setSpeedStr] = useState('');
  const [inclStr, setInclStr] = useState('0');

  const dur = parseFloat(durStr.replace(',', '.'));
  const speedInput = parseFloat(speedStr.replace(',', '.'));
  const incl = parseFloat(inclStr.replace(',', '.'));
  const valid =
    Number.isFinite(dur) && dur > 0 && Number.isFinite(speedInput) && speedInput > 0 && Number.isFinite(incl) && incl >= 0;
  const speedKmh = valid ? (units === 'lb' ? speedInput * KMH_PER_MPH : speedInput) : 0;

  const kcalFor = (e: { speedKmh: number; inclinePct: number; durationMin: number }) =>
    weightKg == null
      ? null
      : treadmillCalories({
          speedKmh: e.speedKmh,
          inclinePct: e.inclinePct,
          durationMin: e.durationMin,
          weightKg,
          profile: data.profile
        });

  const preview = valid ? kcalFor({ speedKmh, inclinePct: incl, durationMin: dur }) : null;
  const totalMin = entries.reduce((n, c) => n + c.durationMin, 0);
  const totalKcal =
    weightKg == null ? null : entries.reduce((sum, c) => sum + (kcalFor(c) ?? 0), 0);

  const displaySpeed = (kmh: number) => roundTo(units === 'lb' ? kmh / KMH_PER_MPH : kmh, 1);

  return (
    <section className="card block-card">
      <header className="block-head">
        <div>
          <h3>Cardio</h3>
          {entries.length > 0 && (
            <div className="sub">
              {roundTo(totalMin, 0)} min this day
              {totalKcal != null && <> · ≈{totalKcal} kcal</>}
            </div>
          )}
        </div>
      </header>

      {entries.length > 0 && (
        <div className="set-list">
          {entries.map((c, i) => {
            const kcal = kcalFor(c);
            return (
              <div key={c.id} className="set-row" style={{ cursor: 'default' }}>
                <span className="set-idx">{i + 1}</span>
                <span className="set-main">
                  {roundTo(c.durationMin, 0)} min · {displaySpeed(c.speedKmh)}{' '}
                  <span className="dim">{speedUnit}</span>
                  {c.inclinePct > 0 && <span className="rpe-tag"> @{roundTo(c.inclinePct, 1)}%</span>}
                </span>
                <span className="set-e1rm">{kcal != null ? `≈${kcal} kcal` : '—'}</span>
                <button
                  type="button"
                  className="icon-btn small"
                  onClick={() => actions.removeCardio(date, c.id)}
                  aria-label="Delete cardio entry"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="set-editor">
        <div className="row">
          <label className="field">
            <span>Minutes</span>
            <input
              className="input"
              inputMode="numeric"
              value={durStr}
              onChange={(e) => setDurStr(e.target.value)}
              placeholder="30"
            />
          </label>
          <label className="field">
            <span>Speed ({speedUnit})</span>
            <input
              className="input"
              inputMode="decimal"
              value={speedStr}
              onChange={(e) => setSpeedStr(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field reps-field">
            <span>Incline %</span>
            <input
              className="input"
              inputMode="decimal"
              value={inclStr}
              onChange={(e) => setInclStr(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        <div className="editor-footer">
          <div className="preview">
            {preview != null && (
              <>
                ≈ <strong>{preview} kcal</strong>
              </>
            )}
          </div>
          <button
            type="button"
            className="btn accent"
            disabled={!valid}
            onClick={() => actions.addCardio(date, { durationMin: dur, speedKmh, inclinePct: incl })}
          >
            + Add cardio
          </button>
        </div>
        {weightKg == null && (
          <div className="sub dim">Log a bodyweight (top of this screen) to unlock calorie estimates.</div>
        )}
        {weightKg != null && profileIncomplete && (
          <div className="sub dim">
            Add height and age in Settings → Profile for a sharper calorie estimate.
          </div>
        )}
      </div>
    </section>
  );
}
