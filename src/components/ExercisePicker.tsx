import { useState } from 'react';
import { getAllExercises } from '../lib/exercises';
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

  const all = getAllExercises(data);
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;
  const hasExact = all.some((e) => e.name.toLowerCase() === q);

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
              {e.isCustom && <span className="tag">custom</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
