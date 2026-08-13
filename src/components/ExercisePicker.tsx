import { useState } from 'react';
import { allTags, hasTag, visibleExercises } from '../lib/exercises';
import { useActions, useApp } from '../lib/store';

export default function ExercisePicker({
  onPick,
  onClose
}: {
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const { data } = useApp();
  const actions = useActions();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const tags = allTags(data);
  const options = visibleExercises(data).filter((e) => !tagFilter || hasTag(e, tagFilter));
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((e) => e.name.toLowerCase().includes(q)) : options;
  const hasExact = visibleExercises(data).some((e) => e.name.toLowerCase() === q);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Add exercise</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          className="input"
          placeholder="Search or type a new name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {tags.length > 0 && (
          <div className="chips-row">
            <button
              type="button"
              className={`chip small${tagFilter == null ? ' active' : ''}`}
              onClick={() => setTagFilter(null)}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t.toLowerCase()}
                type="button"
                className={`chip small${tagFilter?.toLowerCase() === t.toLowerCase() ? ' active' : ''}`}
                onClick={() => setTagFilter(tagFilter?.toLowerCase() === t.toLowerCase() ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="sheet-list">
          {q && !hasExact && (
            <button
              type="button"
              className="list-row create-row"
              onClick={() => onPick(actions.addCustomExercise(query.trim()))}
            >
              + Create “{query.trim()}”
            </button>
          )}
          {filtered.map((e) => (
            <button key={e.id} type="button" className="list-row" onClick={() => onPick(e.id)}>
              <span>{e.name}</span>
            </button>
          ))}
          {options.length === 0 && !q && (
            <div className="empty">No exercises yet — type a name above and create your first lift.</div>
          )}
        </div>
      </div>
    </div>
  );
}
