import { useState } from 'react';
import { exerciseName, visibleExercises } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';

export interface TemplateDraft {
  id: string | null;
  name: string;
  selected: string[];
}

/** Bottom-sheet editor for a lifting day: name it, tick the lifts it contains. */
export default function TemplateEditor({
  initial,
  onClose
}: {
  initial: TemplateDraft;
  onClose: () => void;
}) {
  const { data } = useApp();
  const actions = useActions();
  const [name, setName] = useState(initial.name);
  const [selected, setSelected] = useState<string[]>(initial.selected);

  // Offer everything visible, plus already-selected hidden lifts so editing
  // a day that uses a since-hidden lift doesn't silently drop it.
  const pickable = visibleExercises(data);
  const pickableIds = new Set(pickable.map((e) => e.id));
  const extra = selected
    .filter((id) => !pickableIds.has(id))
    .map((id) => ({ id, name: exerciseName(data, id) }));

  function toggle(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  }

  function save() {
    if (!name.trim() || selected.length === 0) return;
    actions.saveTemplate(name.trim(), selected, initial.id ?? undefined);
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{initial.id ? 'Edit day' : 'New day'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          className="input"
          placeholder="Day name (e.g. Squat Day)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="sheet-list">
          {pickable.length === 0 && extra.length === 0 && (
            <div className="empty">No exercises yet — add some in the Exercises tab first.</div>
          )}
          {[...pickable, ...extra].map((e) => {
            const on = selected.includes(e.id);
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
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn accent"
            style={{ flex: 1 }}
            disabled={!name.trim() || selected.length === 0}
            onClick={save}
          >
            Save day{selected.length > 0 ? ` (${selected.length} lifts)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
