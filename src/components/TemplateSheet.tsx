import { useState } from 'react';
import { exerciseName } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';
import type { WorkoutTemplate } from '../lib/types';
import ConfirmButton from './ConfirmButton';
import TemplateEditor, { type TemplateDraft } from './TemplateEditor';

/**
 * Quick "lifting days" picker opened from the log: tap a day to add all of
 * its exercises to this date in one go.
 */
export default function TemplateSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { data } = useApp();
  const actions = useActions();
  const [editing, setEditing] = useState<TemplateDraft | null>(null);

  const session = data.sessions.find((s) => s.date === date);
  const todaysExercises = session?.blocks.map((b) => b.exerciseId) ?? [];
  const templates = [...data.templates].sort((a, b) => a.name.localeCompare(b.name));

  function apply(tpl: WorkoutTemplate) {
    actions.applyTemplate(date, tpl.exerciseIds);
    onClose();
  }

  if (editing) {
    return <TemplateEditor initial={editing} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Lifting days</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sheet-list">
          {templates.length === 0 && (
            <div className="empty">
              No lifting days yet. Create one and adding a whole day's exercises becomes one tap.
              You can also manage them in the Exercises tab.
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
                onClick={() => setEditing({ id: t.id, name: t.name, selected: [...t.exerciseIds] })}
              >
                ✎
              </button>
              <ConfirmButton
                className="icon-btn small"
                confirmLabel="Delete?"
                ariaLabel={`Delete ${t.name}`}
                onConfirm={() => actions.deleteTemplate(t.id)}
              >
                ✕
              </ConfirmButton>
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
      </div>
    </div>
  );
}
