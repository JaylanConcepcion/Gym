import { useState } from 'react';
import { allTags, PRESET_CATEGORIES } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';

export interface ExerciseDraft {
  id: string | null;
  name: string;
  tags: string[];
}

/** Popup editor for a lift: rename it and manage its tags with chips. */
export default function ExerciseEditorSheet({
  initial,
  onClose
}: {
  initial: ExerciseDraft;
  onClose: () => void;
}) {
  const { data } = useApp();
  const actions = useActions();
  const [name, setName] = useState(initial.name);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Body-part categories first, then any other tags already in use.
  const inTags = (t: string) => tags.some((x) => x.toLowerCase() === t.toLowerCase());
  const suggestions = [
    ...PRESET_CATEGORIES.filter((c) => !inTags(c)),
    ...allTags(data).filter(
      (t) => !inTags(t) && !PRESET_CATEGORIES.some((c) => c.toLowerCase() === t.toLowerCase())
    )
  ];

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const clash = data.customExercises.some(
      (e) => e.id !== initial.id && e.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) {
      setError(`You already have a lift named "${trimmed}".`);
      return;
    }
    if (initial.id) {
      actions.updateExercise(initial.id, trimmed, tags);
    } else {
      actions.addCustomExercise(trimmed, tags);
    }
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{initial.id ? 'Edit exercise' : 'New exercise'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            className="input"
            placeholder="e.g. Pause Squat"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            autoFocus={!initial.id}
          />
        </label>
        {error && <div className="inline-notice">{error}</div>}

        <div className="field">
          <span>Tags</span>
          {tags.length > 0 && (
            <div className="chips-wrap">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chip small active"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove tag ${t}`}
                >
                  {t} ✕
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <input
              className="input"
              placeholder="Add a tag (e.g. legs)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <button
              type="button"
              className="btn ghost"
              disabled={!tagInput.trim()}
              onClick={() => addTag(tagInput)}
            >
              Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="chips-wrap">
              {suggestions.map((t) => (
                <button key={t} type="button" className="chip small" onClick={() => addTag(t)}>
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn accent"
            style={{ flex: 1 }}
            disabled={!name.trim()}
            onClick={save}
          >
            {initial.id ? 'Save changes' : 'Create exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}
