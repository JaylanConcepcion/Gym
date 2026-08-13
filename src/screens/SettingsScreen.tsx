import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { todayISO } from '../lib/dates';
import { allLoggedSets } from '../lib/stats';
import { normalizeData } from '../lib/storage';
import { useActions, useApp } from '../lib/store';
import type { Units } from '../lib/types';

export default function SettingsScreen() {
  const { data } = useApp();
  const actions = useActions();
  const units = data.settings.units;
  const [newExercise, setNewExercise] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const usedIds = useMemo(() => new Set(allLoggedSets(data).map((s) => s.exerciseId)), [data]);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pl-tracker-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyData() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data));
      window.alert('Backup JSON copied to clipboard.');
    } catch {
      window.alert('Could not access the clipboard.');
    }
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = normalizeData(JSON.parse(text));
        if (!parsed) {
          window.alert('That file is not a valid backup.');
          return;
        }
        const sets = parsed.sessions.reduce(
          (n, s) => n + s.blocks.reduce((m, b) => m + b.sets.length, 0),
          0
        );
        if (
          window.confirm(
            `Replace current data with this backup? (${parsed.sessions.length} sessions, ${sets} sets, ${parsed.bodyWeights.length} weigh-ins)`
          )
        ) {
          actions.importData(parsed);
        }
      } catch {
        window.alert('Could not read that file.');
      }
    });
  }

  function addExercise() {
    const name = newExercise.trim();
    if (!name) return;
    actions.addCustomExercise(name);
    setNewExercise('');
  }

  function removeExercise(id: string, name: string) {
    if (usedIds.has(id)) {
      window.alert(`"${name}" has logged sets, so it can't be deleted. Its history would be orphaned.`);
      return;
    }
    if (window.confirm(`Delete custom exercise "${name}"?`)) {
      actions.removeCustomExercise(id);
    }
  }

  function clearAll() {
    if (
      window.confirm('Delete ALL sessions, bodyweight entries and custom exercises?') &&
      window.confirm('Really sure? This cannot be undone. (Export a backup first!)')
    ) {
      actions.clearAll();
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>
      <div className="stack">
        <section className="card">
          <h3>Units</h3>
          <div className="seg">
            {(['lb', 'kg'] as Units[]).map((u) => (
              <button
                key={u}
                type="button"
                className={`seg-btn${units === u ? ' active' : ''}`}
                onClick={() => actions.setUnits(u)}
              >
                {u}
              </button>
            ))}
          </div>
          <div className="sub dim">Existing entries convert automatically — history is stored unit-agnostic.</div>
        </section>

        <section className="card">
          <h3>Custom exercises</h3>
          {data.customExercises.length === 0 && (
            <div className="sub dim">None yet. You can also create them from the exercise picker.</div>
          )}
          {data.customExercises.map((e) => (
            <div key={e.id} className="list-row static">
              <span>{e.name}</span>
              <button
                type="button"
                className="icon-btn small"
                onClick={() => removeExercise(e.id, e.name)}
                aria-label={`Delete ${e.name}`}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="row">
            <input
              className="input"
              placeholder="New exercise name"
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
            />
            <button type="button" className="btn ghost" onClick={addExercise} disabled={!newExercise.trim()}>
              Add
            </button>
          </div>
        </section>

        <section className="card">
          <h3>Backup</h3>
          <div className="sub dim" style={{ marginBottom: 10 }}>
            All data lives on this device only. Export a backup now and then so you never lose training
            history.
          </div>
          <div className="row wrap">
            <button type="button" className="btn ghost" onClick={exportData}>
              Export file
            </button>
            <button type="button" className="btn ghost" onClick={copyData}>
              Copy JSON
            </button>
            <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
              Import file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={onImportFile}
            />
          </div>
        </section>

        <section className="card danger-zone">
          <h3>Danger zone</h3>
          <button type="button" className="btn ghost danger" onClick={clearAll}>
            Clear all data
          </button>
        </section>

        <div className="sub dim about">
          Powerlifting Tracker v1.0.0 · e1RM uses the RTS-style RPE chart (Epley beyond 12 effective
          reps).
        </div>
      </div>
    </div>
  );
}
