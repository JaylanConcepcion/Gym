import { useState } from 'react';
import { exerciseName, visibleExercises } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import type { WorkoutTemplate } from '../lib/types';

/**
 * "Lifting days" manager: pick a saved day to add all of its exercises to the
 * log in one tap, or create/edit/delete day templates.
 */
export default function TemplateSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { data } = useApp();
  const actions = useActions();

  const [editing, setEditing] = useState<{ id: string | null; name: string; selected: string[] } | null>(
    null
  );

  const session = data.sessions.find((s) => s.date === date);
  const todaysExercises = session?.blocks.map((b) => b.exerciseId) ?? [];
  const templates = [...data.templates].sort((a, b) => a.name.localeCompare(b.name));

  // Offer everything visible, plus anything already in the template being edited
  // (so editing a template that uses a since-hidden lift doesn't drop it).
  const pickable = visibleExercises(data);
  const pickableIds = new Set(pickable.map((e) => e.id));
  const extraIds = (editing?.selected ?? []).filter((id) => !pickableIds.has(id));

  function apply(tpl: WorkoutTemplate) {
    actions.applyTemplate(date, tpl.exerciseIds);
    onClose();
  }

  function toggle(id: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      selected: editing.selected.includes(id)
        ? editing.selected.filter((x) => x !== id)
        : [...editing.selected, id]
    });
  }

  function save() {
    if (!editing || !editing.name.trim() || editing.selected.length === 0) return;
    actions.saveTemplate(editing.name.trim(), editing.selected, editing.id ?? undefined);
    setEditing(null);
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{editing ? (editing.id ? 'Edit day' : 'New day') : 'Lifting days'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {editing ? (
          <>
            <input
              className="input"
              placeholder="Day name (e.g. Squat Day)"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              autoFocus
            />
            <div className="sheet-list">
              {[...pickable, ...extraIds.map((id) => ({ id, name: exerciseName(data, id) }))].map((e) => {
                const on = editing.selected.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`list-row${on ? ' selected-row' : ''}`}
                    onClick={() => toggle(e.id)}
                  >
                    <span>{e.name}</span>
                    <span className={`check-dot${on ? ' on' : ''}`}>{on ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn accent"
                style={{ flex: 1 }}
                disabled={!editing.name.trim() || editing.selected.length === 0}
                onClick={save}
              >
                Save day{editing.selected.length > 0 ? ` (${editing.selected.length} lifts)` : ''}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sheet-list">
              {templates.length === 0 && (
                <div className="empty">
                  No lifting days yet. Create one and adding a whole day's exercises becomes one tap.
                </div>
              )}
              {templates.map((t) => (
                <div key={t.id} className="list-row tpl-row">
                  <button type="button" className="tpl-main" onClick={() => apply(t)}>
                    <span className="tpl-name">{t.name}</span>
                    <span className="sub dim">
                      {t.exerciseIds.map((id) => exerciseName(data, id)).join(' · ')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn small"
                    aria-label={`Edit ${t.name}`}
                    onClick={() =>
                      setEditing({ id: t.id, name: t.name, selected: [...t.exerciseIds] })
                    }
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
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn accent block"
              onClick={() => setEditing({ id: null, name: '', selected: [] })}
            >
              + New lifting day
            </button>
            {todaysExercises.length > 0 && (
              <button
                type="button"
                className="btn ghost block"
                onClick={() => setEditing({ id: null, name: '', selected: [...new Set(todaysExercises)] })}
              >
                Save today's exercises as a day
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
