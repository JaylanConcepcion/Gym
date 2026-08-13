import { useMemo, useState } from 'react';
import TemplateEditor, { type TemplateDraft } from '../components/TemplateEditor';
import { todayISO } from '../lib/dates';
import { exerciseName, hiddenExerciseIds } from '../lib/exercises';
import { allLoggedSets } from '../lib/stats';
import { useActions, useApp } from '../lib/store';

export default function ExercisesScreen({ onGoToLog }: { onGoToLog: () => void }) {
  const { data } = useApp();
  const actions = useActions();
  const [editing, setEditing] = useState<TemplateDraft | null>(null);
  const [newExercise, setNewExercise] = useState('');

  const usedIds = useMemo(() => new Set(allLoggedSets(data).map((s) => s.exerciseId)), [data]);
  const hidden = useMemo(() => hiddenExerciseIds(data), [data]);
  const templates = [...data.templates].sort((a, b) => a.name.localeCompare(b.name));

  function useToday(templateId: string) {
    const tpl = data.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    actions.applyTemplate(todayISO(), tpl.exerciseIds);
    onGoToLog();
  }

  function addExercise() {
    const name = newExercise.trim();
    if (!name) return;
    actions.addCustomExercise(name);
    setNewExercise('');
  }

  function removeExercise(id: string, name: string) {
    if (usedIds.has(id)) {
      window.alert(`"${name}" has logged sets, so it can't be deleted. Hide it instead.`);
      return;
    }
    if (window.confirm(`Delete custom exercise "${name}"?`)) {
      actions.removeCustomExercise(id);
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Exercises</h1>
      </header>
      <div className="stack">
        <section className="card">
          <h3>Lifting days</h3>
          <div className="sub dim" style={{ marginBottom: 8 }}>
            Group the lifts you always do together. "Use today" adds the whole day to your log in
            one tap.
          </div>
          {templates.length === 0 && (
            <div className="sub dim" style={{ marginBottom: 8 }}>
              No days yet — create your first one below.
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} className="tpl-static">
              <div className="tpl-info">
                <span className="tpl-name">{t.name}</span>
                <span className="sub dim">
                  {t.exerciseIds.map((id) => exerciseName(data, id)).join(' · ')}
                </span>
              </div>
              <span className="row" style={{ gap: 6, flex: 'none' }}>
                <button type="button" className="btn accent small" onClick={() => useToday(t.id)}>
                  Use today
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  aria-label={`Edit ${t.name}`}
                  onClick={() => setEditing({ id: t.id, name: t.name, selected: [...t.exerciseIds] })}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete lifting day "${t.name}"?`)) actions.deleteTemplate(t.id);
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 8 }}
            onClick={() => setEditing({ id: null, name: '', selected: [] })}
          >
            + New lifting day
          </button>
        </section>

        <section className="card">
          <h3>My exercises</h3>
          <div className="sub dim" style={{ marginBottom: 8 }}>
            Your list, your lifts. Hide ones you're not running right now (history is kept); delete
            is available while a lift has no logged sets.
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              className="input"
              placeholder="New exercise name (e.g. Squat)"
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
            />
            <button type="button" className="btn ghost" onClick={addExercise} disabled={!newExercise.trim()}>
              Add
            </button>
          </div>
          {data.customExercises.length === 0 && (
            <div className="empty">Nothing here yet — add your first lift above.</div>
          )}
          {data.customExercises.map((e) => {
            const isHidden = hidden.has(e.id);
            return (
              <div key={e.id} className={`list-row static${isHidden ? ' muted' : ''}`}>
                <span>{e.name}</span>
                <span className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => actions.setExerciseHidden(e.id, !isHidden)}
                  >
                    {isHidden ? 'Show' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    className="icon-btn small"
                    onClick={() => removeExercise(e.id, e.name)}
                    aria-label={`Delete ${e.name}`}
                  >
                    ✕
                  </button>
                </span>
              </div>
            );
          })}
        </section>
      </div>
      {editing && <TemplateEditor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
