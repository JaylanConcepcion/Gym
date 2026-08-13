import { useState } from 'react';
import { BIG3, exerciseName } from '../lib/exercises';
import { prRecords } from '../lib/stats';
import { useApp } from '../lib/store';
import { formatWeightValue, kgToDisplay, roundTo } from '../lib/units';

const PCT_OPTIONS = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

/** Simple percentage-of-1RM calculator, opened from the Log header. */
export default function OneRmCalculatorSheet({ onClose }: { onClose: () => void }) {
  const { data } = useApp();
  const units = data.settings.units;

  const [oneRmStr, setOneRmStr] = useState('');
  const [pct, setPct] = useState(80);
  const [customPctStr, setCustomPctStr] = useState('');

  // One-tap prefill with the current all-time best e1RM for the big three.
  const prefills = BIG3.map((id) => {
    const best = prRecords(data, id).bestE1rm;
    return best ? { id, name: exerciseName(data, id), e1rmKg: best.e1rmKg } : null;
  }).filter((x): x is { id: string; name: string; e1rmKg: number } => x != null);

  const customPct = parseFloat(customPctStr.replace(',', '.'));
  const effectivePct = Number.isFinite(customPct) && customPct > 0 ? customPct : pct;

  const oneRm = parseFloat(oneRmStr.replace(',', '.'));
  const valid = Number.isFinite(oneRm) && oneRm > 0;
  const result = valid ? (oneRm * effectivePct) / 100 : null;
  const plateStep = units === 'lb' ? 5 : 2.5;
  const nearestPlate = result != null ? Math.round(result / plateStep) * plateStep : null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>% of 1RM calculator</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="field">
          <span>1 rep max ({units})</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="0"
            value={oneRmStr}
            onChange={(e) => setOneRmStr(e.target.value)}
            autoFocus
          />
        </label>

        {prefills.length > 0 && (
          <div className="chips-wrap">
            {prefills.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip small"
                onClick={() => setOneRmStr(formatWeightValue(p.e1rmKg, units, 0))}
              >
                {p.name} · {formatWeightValue(p.e1rmKg, units, 0)}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <span>Percentage</span>
          <div className="chips-row">
            {PCT_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip small${effectivePct === p && !customPctStr ? ' active' : ''}`}
                onClick={() => {
                  setPct(p);
                  setCustomPctStr('');
                }}
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="Custom % (e.g. 77.5)"
              value={customPctStr}
              onChange={(e) => setCustomPctStr(e.target.value)}
            />
          </div>
        </div>

        <div className="calc-result card">
          {result != null ? (
            <>
              <div className="stat-label">
                {roundTo(effectivePct, 1)}% of {roundTo(oneRm, 1)} {units}
              </div>
              <div className="calc-value">
                {roundTo(result, 1)} <span className="dim">{units}</span>
              </div>
              {nearestPlate != null && Math.abs(nearestPlate - result) > 0.01 && (
                <div className="sub dim">
                  ≈ {nearestPlate} {units} loaded to the nearest {plateStep} {units}
                </div>
              )}
            </>
          ) : (
            <div className="sub dim">Enter your 1RM above to calculate.</div>
          )}
        </div>
      </div>
    </div>
  );
}
