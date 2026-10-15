import { useEffect, useRef, useState } from 'react';
import { estimate1RM } from '../lib/e1rm';
import { exerciseName } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import { displayToKg, formatWeightValue } from '../lib/units';
import type { ExerciseBlock, Units, WorkoutSet } from '../lib/types';
import ConfirmButton from './ConfirmButton';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const REPS_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

/** Reps dropdown: AMRAP (to failure, count optional) on top, then 1–50. */
function RepsSelect({
  value,
  onChange,
  label
}: {
  /** '' (unset), 'amrap', or a rep number as string. */
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <select
      className="input compact rpe-select"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Reps
      </option>
      <option value="amrap">AMRAP</option>
      {REPS_OPTIONS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

interface Draft {
  w: string;
  r: string;
  rpe: number | null;
  amrap?: boolean;
  dirty: boolean;
}

/**
 * Typed-but-not-yet-logged values survive tab switches without ever being
 * committed implicitly — logging only happens via the Log set button.
 */
function loadDraft(blockId: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(`pl-draft/${blockId}`);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(blockId: string, d: Draft) {
  try {
    sessionStorage.setItem(`pl-draft/${blockId}`, JSON.stringify(d));
  } catch {
    // Best effort only.
  }
}

function RpeSelect({
  rpe,
  amrap,
  onChange,
  label
}: {
  rpe: number | null;
  amrap: boolean;
  onChange: (rpe: number | null, amrap: boolean) => void;
  label: string;
}) {
  return (
    <select
      className="input compact rpe-select"
      aria-label={label}
      value={amrap ? 'amrap' : rpe == null ? '' : String(rpe)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'amrap') onChange(10, true);
        else if (v === '') onChange(null, false);
        else onChange(parseFloat(v), false);
      }}
    >
      <option value="">—</option>
      {RPE_VALUES.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
      <option value="amrap">AMRAP</option>
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
  const [repsStr, setRepsStr] = useState(() => (set.reps >= 1 ? String(set.reps) : ''));
  const [rpe, setRpe] = useState<number | null>(set.rpe);
  const [amrap, setAmrap] = useState(set.amrap ?? false);
  const lastSentRef = useRef({ w: set.weightKg, r: set.reps, rpe: set.rpe, amrap: set.amrap ?? false });

  // Re-sync when the stored set changes from elsewhere (sync from the other device).
  useEffect(() => {
    const ls = lastSentRef.current;
    const setAmrapVal = set.amrap ?? false;
    if (set.weightKg !== ls.w || set.reps !== ls.r || set.rpe !== ls.rpe || setAmrapVal !== ls.amrap) {
      setWeightStr(formatWeightValue(set.weightKg, units));
      setRepsStr(set.reps >= 1 ? String(set.reps) : '');
      setRpe(set.rpe);
      setAmrap(setAmrapVal);
      lastSentRef.current = { w: set.weightKg, r: set.reps, rpe: set.rpe, amrap: setAmrapVal };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg, set.reps, set.rpe, set.amrap]);

  // Re-render display strings when lb/kg is toggled.
  useEffect(() => {
    setWeightStr(formatWeightValue(set.weightKg, units));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  function commit(nextWeightStr: string, nextRepsStr: string, nextRpe: number | null, nextAmrap: boolean) {
    const weightVal = parseFloat(nextWeightStr.replace(',', '.'));
    const parsedReps = parseInt(nextRepsStr, 10);
    const repsOk = Number.isFinite(parsedReps) && parsedReps >= 1;
    if (!Number.isFinite(weightVal) || weightVal <= 0) return;
    // AMRAP sets don't require a rep count — 0 means "to failure, not counted".
    if (!repsOk && !nextAmrap) return;
    const reps = repsOk ? parsedReps : 0;
    const weightKg = displayToKg(weightVal, units);
    lastSentRef.current = { w: weightKg, r: reps, rpe: nextRpe, amrap: nextAmrap };
    actions.updateSet(date, blockId, set.id, { weightKg, reps, rpe: nextRpe, amrap: nextAmrap });
  }

  const weightVal = parseFloat(weightStr.replace(',', '.'));
  const reps = parseInt(repsStr, 10);
  const repsOk = Number.isFinite(reps) && reps >= 1;
  const valid = Number.isFinite(weightVal) && weightVal > 0 && (repsOk || amrap);
  const e1 =
    valid && repsOk
      ? estimate1RM(displayToKg(weightVal, units), reps, rpe)
      : estimate1RM(set.weightKg, set.reps, set.rpe);

  return (
    <div className="set-grid">
      <span className="set-num">{index + 1}</span>
      <input
        className="input compact"
        inputMode="decimal"
        value={weightStr}
        onChange={(e) => {
          setWeightStr(e.target.value);
          commit(e.target.value, repsStr, rpe, amrap);
        }}
        placeholder="0"
        aria-label="Weight"
      />
      <RepsSelect
        label="Reps"
        value={amrap && !Number.isFinite(parseInt(repsStr, 10)) ? 'amrap' : repsStr}
        onChange={(v) => {
          if (v === 'amrap') {
            setRepsStr('');
            setAmrap(true);
            setRpe(10);
            commit(weightStr, '', 10, true);
          } else {
            setRepsStr(v);
            commit(weightStr, v, rpe, amrap);
          }
        }}
      />
      <RpeSelect
        rpe={rpe}
        amrap={amrap}
        label="RPE"
        onChange={(v, a) => {
          setRpe(v);
          setAmrap(a);
          commit(weightStr, repsStr, v, a);
        }}
      />
      <span className="set-e1rm-cell">{e1 > 0 ? formatWeightValue(e1, units, 0) : '—'}</span>
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
  const [dWeight, setDWeight] = useState(
    () => loadDraft(block.id)?.w ?? (last ? formatWeightValue(last.weightKg, units) : '')
  );
  const [dReps, setDReps] = useState(() => loadDraft(block.id)?.r ?? (last ? String(last.reps) : ''));
  const [dRpe, setDRpe] = useState<number | null>(() => {
    const cached = loadDraft(block.id);
    return cached ? cached.rpe : last ? last.rpe : 8;
  });
  const [dAmrap, setDAmrap] = useState<boolean>(() => {
    const cached = loadDraft(block.id);
    return cached ? (cached.amrap ?? false) : (last?.amrap ?? false);
  });
  /** True while the draft holds typed values that haven't been logged yet. */
  const [dDirty, setDDirty] = useState(() => loadDraft(block.id)?.dirty ?? false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    saveDraft(block.id, { w: dWeight, r: dReps, rpe: dRpe, amrap: dAmrap, dirty: dDirty });
  }, [block.id, dWeight, dReps, dRpe, dAmrap, dDirty]);

  const weightVal = parseFloat(dWeight.replace(',', '.'));
  const reps = parseInt(dReps, 10);
  const repsOk = Number.isFinite(reps) && reps >= 1;
  const valid = Number.isFinite(weightVal) && weightVal > 0 && (repsOk || dAmrap);
  const draftE1rm = valid && repsOk ? estimate1RM(displayToKg(weightVal, units), reps, dRpe) : null;

  const topSet = block.sets.reduce<WorkoutSet | null>(
    (top, s) =>
      !top || s.weightKg > top.weightKg || (s.weightKg === top.weightKg && s.reps > top.reps) ? s : top,
    null
  );

  function addSet() {
    if (!valid) return;
    actions.addSet(date, block.id, {
      weightKg: displayToKg(weightVal, units),
      reps: repsOk ? reps : 0,
      rpe: dRpe,
      amrap: dAmrap
    });
    setDDirty(false);
    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 1400);
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
              top set {formatWeightValue(topSet.weightKg, units)} ×{' '}
              {topSet.reps >= 1 ? topSet.reps : 'AMRAP'}
              {topSet.amrap && topSet.reps >= 1 ? ' AMRAP' : !topSet.amrap && topSet.rpe != null ? ` @${topSet.rpe}` : ''}
              {estimate1RM(topSet.weightKg, topSet.reps, topSet.rpe) > 0 && (
                <>
                  {' '}
                  · e1RM{' '}
                  {formatWeightValue(estimate1RM(topSet.weightKg, topSet.reps, topSet.rpe), units, 0)}{' '}
                  {units}
                </>
              )}
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

      <div className={`set-grid draft${dDirty && valid ? ' unlogged' : ''}`}>
        <span className="set-num">+</span>
        <input
          className="input compact"
          inputMode="decimal"
          value={dWeight}
          onChange={(e) => {
            setDWeight(e.target.value);
            setDDirty(true);
          }}
          placeholder="0"
          aria-label="New set weight"
        />
        <RepsSelect
          label="New set reps"
          value={dAmrap && !repsOk ? 'amrap' : dReps}
          onChange={(v) => {
            if (v === 'amrap') {
              setDReps('');
              setDAmrap(true);
              setDRpe(10);
            } else {
              setDReps(v);
            }
            setDDirty(true);
          }}
        />
        <RpeSelect
          rpe={dRpe}
          amrap={dAmrap}
          label="New set RPE"
          onChange={(v, a) => {
            setDRpe(v);
            setDAmrap(a);
          }}
        />
        <span className="set-e1rm-cell">{draftE1rm != null ? formatWeightValue(draftE1rm, units, 0) : ''}</span>
        <span />
      </div>
      <button
        type="button"
        className={`btn accent block log-set-btn${dDirty && valid ? ' attention' : ''}`}
        disabled={!valid}
        onClick={addSet}
      >
        {justLogged
          ? '✓ Logged — tap again for another set'
          : valid
            ? `＋ Log set — ${dWeight} ${units} × ${repsOk ? dReps : 'AMRAP'}${
                dAmrap && repsOk ? ' AMRAP' : !dAmrap && dRpe != null ? ` @${dRpe}` : ''
              }`
            : dAmrap
              ? '＋ Log set (enter weight above)'
              : '＋ Log set (enter weight & reps above)'}
      </button>
    </section>
  );
}
