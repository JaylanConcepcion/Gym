import { useEffect, useRef, useState } from 'react';
import { estimate1RM } from '../lib/e1rm';
import { exerciseName } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import { displayToKg, formatWeightValue } from '../lib/units';
import type { ExerciseBlock, Units, WorkoutSet } from '../lib/types';
import ConfirmButton from './ConfirmButton';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function RpeSelect({
  value,
  onChange,
  label
}: {
  value: number | null;
  onChange: (rpe: number | null) => void;
  label: string;
}) {
  return (
    <select
      className="input compact rpe-select"
      aria-label={label}
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
    >
      <option value="">—</option>
      {RPE_VALUES.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

/** One committed set as an inline-editable row; edits save as soon as they're valid. */
function SetRow({
  date,
  blockId,
  set,
  index,
  units
}: {
  date: string;
  blockId: string;
  set: WorkoutSet;
  index: number;
  units: Units;
}) {
  const actions = useActions();
  const [weightStr, setWeightStr] = useState(() => formatWeightValue(set.weightKg, units));
  const [repsStr, setRepsStr] = useState(() => String(set.reps));
  const [rpe, setRpe] = useState<number | null>(set.rpe);
  const lastSentRef = useRef({ w: set.weightKg, r: set.reps, rpe: set.rpe });

  // Re-sync when the stored set changes from elsewhere (sync from the other device).
  useEffect(() => {
    const ls = lastSentRef.current;
    if (set.weightKg !== ls.w || set.reps !== ls.r || set.rpe !== ls.rpe) {
      setWeightStr(formatWeightValue(set.weightKg, units));
      setRepsStr(String(set.reps));
      setRpe(set.rpe);
      lastSentRef.current = { w: set.weightKg, r: set.reps, rpe: set.rpe };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg, set.reps, set.rpe]);

  // Re-render display strings when lb/kg is toggled.
  useEffect(() => {
    setWeightStr(formatWeightValue(set.weightKg, units));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  function commit(nextWeightStr: string, nextRepsStr: string, nextRpe: number | null) {
    const weightVal = parseFloat(nextWeightStr.replace(',', '.'));
    const reps = parseInt(nextRepsStr, 10);
    if (!Number.isFinite(weightVal) || weightVal <= 0 || !Number.isFinite(reps) || reps < 1) return;
    const weightKg = displayToKg(weightVal, units);
    lastSentRef.current = { w: weightKg, r: reps, rpe: nextRpe };
    actions.updateSet(date, blockId, set.id, { weightKg, reps, rpe: nextRpe });
  }

  const weightVal = parseFloat(weightStr.replace(',', '.'));
  const reps = parseInt(repsStr, 10);
  const valid = Number.isFinite(weightVal) && weightVal > 0 && Number.isFinite(reps) && reps >= 1;
  const e1 = valid ? estimate1RM(displayToKg(weightVal, units), reps, rpe) : estimate1RM(set.weightKg, set.reps, set.rpe);

  return (
    <div className="set-grid">
      <span className="set-num">{index + 1}</span>
      <input
        className="input compact"
        inputMode="decimal"
        value={weightStr}
        onChange={(e) => {
          setWeightStr(e.target.value);
          commit(e.target.value, repsStr, rpe);
        }}
        placeholder="0"
        aria-label="Weight"
      />
      <input
        className="input compact"
        inputMode="numeric"
        value={repsStr}
        onChange={(e) => {
          setRepsStr(e.target.value);
          commit(weightStr, e.target.value, rpe);
        }}
        placeholder="0"
        aria-label="Reps"
      />
      <RpeSelect
        value={rpe}
        label="RPE"
        onChange={(v) => {
          setRpe(v);
          commit(weightStr, repsStr, v);
        }}
      />
      <span className="set-e1rm-cell">{formatWeightValue(e1, units, 0)}</span>
      <button
        type="button"
        className="icon-btn small"
        onClick={() => actions.removeSet(date, blockId, set.id)}
        aria-label="Delete set"
      >
        ✕
      </button>
    </div>
  );
}

export default function ExerciseBlockCard({ date, block }: { date: string; block: ExerciseBlock }) {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const exName = exerciseName(data, block.exerciseId);

  const last = block.sets[block.sets.length - 1];
  const [dWeight, setDWeight] = useState(last ? formatWeightValue(last.weightKg, units) : '');
  const [dReps, setDReps] = useState(last ? String(last.reps) : '');
  const [dRpe, setDRpe] = useState<number | null>(last ? last.rpe : 8);

  const weightVal = parseFloat(dWeight.replace(',', '.'));
  const reps = parseInt(dReps, 10);
  const valid = Number.isFinite(weightVal) && weightVal > 0 && Number.isFinite(reps) && reps >= 1;
  const draftE1rm = valid ? estimate1RM(displayToKg(weightVal, units), reps, dRpe) : null;

  const topSet = block.sets.reduce<WorkoutSet | null>(
    (top, s) =>
      !top || s.weightKg > top.weightKg || (s.weightKg === top.weightKg && s.reps > top.reps) ? s : top,
    null
  );

  function addSet() {
    if (!valid) return;
    actions.addSet(date, block.id, { weightKg: displayToKg(weightVal, units), reps, rpe: dRpe });
  }

  function removeBlock() {
    actions.removeBlock(date, block.id);
  }

  return (
    <section className="card block-card">
      <header className="block-head">
        <div>
          <h3>{exName}</h3>
          {topSet && (
            <div className="sub">
              top set {formatWeightValue(topSet.weightKg, units)} × {topSet.reps}
              {topSet.rpe != null && ` @${topSet.rpe}`} · e1RM{' '}
              {formatWeightValue(estimate1RM(topSet.weightKg, topSet.reps, topSet.rpe), units, 0)} {units}
            </div>
          )}
        </div>
        {block.sets.length === 0 ? (
          <button type="button" className="icon-btn" onClick={removeBlock} aria-label={`Remove ${exName}`}>
            ✕
          </button>
        ) : (
          <ConfirmButton className="icon-btn" confirmLabel="Remove?" ariaLabel={`Remove ${exName}`} onConfirm={removeBlock}>
            ✕
          </ConfirmButton>
        )}
      </header>

      <div className="set-grid head">
        <span>Set</span>
        <span>{units}</span>
        <span>Reps</span>
        <span>RPE</span>
        <span className="set-e1rm-cell">e1RM</span>
        <span />
      </div>

      {block.sets.map((s, i) => (
        <SetRow key={s.id} date={date} blockId={block.id} set={s} index={i} units={units} />
      ))}

      <div className="set-grid draft">
        <span className="set-num">+</span>
        <input
          className="input compact"
          inputMode="decimal"
          value={dWeight}
          onChange={(e) => setDWeight(e.target.value)}
          placeholder="0"
          aria-label="New set weight"
        />
        <input
          className="input compact"
          inputMode="numeric"
          value={dReps}
          onChange={(e) => setDReps(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSet();
            }
          }}
          placeholder="0"
          aria-label="New set reps"
        />
        <RpeSelect value={dRpe} label="New set RPE" onChange={setDRpe} />
        <span className="set-e1rm-cell">{draftE1rm != null ? formatWeightValue(draftE1rm, units, 0) : ''}</span>
        <button
          type="button"
          className="add-set-btn"
          disabled={!valid}
          onClick={addSet}
          aria-label="Add set"
        >
          +
        </button>
      </div>
    </section>
  );
}
