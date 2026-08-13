import { useState } from 'react';
import { useActions, useApp } from '../lib/store';
import { displayToKg, formatWeight, formatWeightValue } from '../lib/units';

export default function BodyWeightCard({ date }: { date: string }) {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const entry = data.bodyWeights.find((b) => b.date === date);

  const [editing, setEditing] = useState(false);
  const [valStr, setValStr] = useState('');

  function open() {
    setValStr(entry ? formatWeightValue(entry.weightKg, units) : '');
    setEditing(true);
  }

  function save() {
    const v = parseFloat(valStr.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) {
      actions.setBodyWeight(date, displayToKg(v, units));
      setEditing(false);
    }
  }

  return (
    <div className="card bw-card">
      <div className="bw-label">Bodyweight</div>
      {editing ? (
        <div className="row bw-edit">
          <input
            className="input"
            inputMode="decimal"
            autoFocus
            value={valStr}
            onChange={(e) => setValStr(e.target.value)}
            placeholder={units}
          />
          <button type="button" className="btn accent" onClick={save}>
            Save
          </button>
          {entry && (
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => {
                actions.setBodyWeight(date, null);
                setEditing(false);
              }}
            >
              Remove
            </button>
          )}
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : entry ? (
        <button type="button" className="bw-value" onClick={open}>
          {formatWeight(entry.weightKg, units)}
        </button>
      ) : (
        <button type="button" className="btn ghost small" onClick={open}>
          + Add
        </button>
      )}
    </div>
  );
}
