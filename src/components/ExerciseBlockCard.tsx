import { useState } from 'react';
import { estimate1RM } from '../lib/e1rm';
import { exerciseName } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import { displayToKg, formatWeight, formatWeightValue } from '../lib/units';
import type { ExerciseBlock } from '../lib/types';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export default function ExerciseBlockCard({ date, block }: { date: string; block: ExerciseBlock }) {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const exName = exerciseName(data, block.exerciseId);

  const last = block.sets[block.sets.length - 1];
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [weightStr, setWeightStr] = useState(last ? formatWeightValue(last.weightKg, units) : '');
  const [repsStr, setRepsStr] = useState(last ? String(last.reps) : '');
  const [rpe, setRpe] = useState<number | null>(last ? last.rpe : 8);

  const weightVal = parseFloat(weightStr.replace(',', '.'));
  const reps = parseInt(repsStr, 10);
  const valid = Number.isFinite(weightVal) && weightVal > 0 && Number.isFinite(reps) && reps >= 1;
  const weightKg = valid ? displayToKg(weightVal, units) : 0;
  const previewE1rm = valid ? estimate1RM(weightKg, reps, rpe) : null;

  const dayBestKg = block.sets.reduce((max, s) => Math.max(max, estimate1RM(s.weightKg, s.reps, s.rpe)), 0);

  function submit() {
    if (!valid) return;
    if (editingSetId) {
      actions.updateSet(date, block.id, editingSetId, { weightKg, reps, rpe });
      setEditingSetId(null);
    } else {
      actions.addSet(date, block.id, { weightKg, reps, rpe });
    }
  }

  function startEdit(setId: string) {
    const s = block.sets.find((x) => x.id === setId);
    if (!s) return;
    setEditingSetId(setId);
    setWeightStr(formatWeightValue(s.weightKg, units));
    setRepsStr(String(s.reps));
    setRpe(s.rpe);
  }

  function removeBlock() {
    if (
      block.sets.length === 0 ||
      window.confirm(`Remove ${exName} and its ${block.sets.length} set(s) from this day?`)
    ) {
      actions.removeBlock(date, block.id);
    }
  }

  return (
    <section className="card block-card">
      <header className="block-head">
        <div>
          <h3>{exName}</h3>
          {dayBestKg > 0 && <div className="sub">best e1RM this day · {formatWeight(dayBestKg, units, 0)}</div>}
        </div>
        <button type="button" className="icon-btn" onClick={removeBlock} aria-label={`Remove ${exName}`}>
          ✕
        </button>
      </header>

      {block.sets.length > 0 && (
        <div className="set-list">
          {block.sets.map((s, i) => {
            const e1 = estimate1RM(s.weightKg, s.reps, s.rpe);
            return (
              <div
                key={s.id}
                className={`set-row${editingSetId === s.id ? ' editing' : ''}`}
                onClick={() => startEdit(s.id)}
                role="button"
                tabIndex={0}
              >
                <span className="set-idx">{i + 1}</span>
                <span className="set-main">
                  {formatWeightValue(s.weightKg, units)} <span className="dim">{units}</span> × {s.reps}
                  {s.rpe != null && <span className="rpe-tag"> @{s.rpe}</span>}
                </span>
                <span className="set-e1rm">e1RM {formatWeightValue(e1, units, 0)}</span>
                <button
                  type="button"
                  className="icon-btn small"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.removeSet(date, block.id, s.id);
                    if (editingSetId === s.id) setEditingSetId(null);
                  }}
                  aria-label="Delete set"
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
            <span>Weight ({units})</span>
            <input
              className="input"
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field reps-field">
            <span>Reps</span>
            <input
              className="input"
              inputMode="numeric"
              value={repsStr}
              onChange={(e) => setRepsStr(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        <div className="field">
          <span>RPE</span>
          <div className="chips-row">
            <button
              type="button"
              className={`chip${rpe == null ? ' active' : ''}`}
              onClick={() => setRpe(null)}
            >
              —
            </button>
            {RPE_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${rpe === v ? ' active' : ''}`}
                onClick={() => setRpe(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-footer">
          <div className="preview">
            {previewE1rm != null && (
              <>
                e1RM ≈ <strong>{formatWeight(previewE1rm, units, 0)}</strong>
              </>
            )}
          </div>
          <div className="row">
            {editingSetId && (
              <button type="button" className="btn ghost" onClick={() => setEditingSetId(null)}>
                Cancel
              </button>
            )}
            <button type="button" className="btn accent" disabled={!valid} onClick={submit}>
              {editingSetId ? 'Update set' : '+ Add set'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
