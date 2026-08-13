import { useState } from 'react';
import { useActions, useApp } from '../lib/store';
import ExerciseBlockCard from './ExerciseBlockCard';
import ExercisePicker from './ExercisePicker';
import TemplateSheet from './TemplateSheet';

export default function SessionEditor({ date }: { date: string }) {
  const { data } = useApp();
  const actions = useActions();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const session = data.sessions.find((s) => s.date === date);
  const blocks = session?.blocks ?? [];

  return (
    <div className="stack">
      {blocks.map((b) => (
        <ExerciseBlockCard key={b.id} date={date} block={b} />
      ))}
      {blocks.length === 0 && (
        <div className="card empty">
          No lifts logged for this day yet. Add an exercise — or use a lifting day to add a whole
          workout in one tap.
        </div>
      )}
      <div className="row editor-actions">
        <button type="button" className="btn accent" onClick={() => setPickerOpen(true)}>
          + Add exercise
        </button>
        <button type="button" className="btn ghost" onClick={() => setTemplatesOpen(true)}>
          Lifting days
        </button>
      </div>
      {pickerOpen && (
        <ExercisePicker
          onClose={() => setPickerOpen(false)}
          onPick={(exerciseId) => {
            actions.addBlock(date, exerciseId);
            setPickerOpen(false);
          }}
        />
      )}
      {templatesOpen && <TemplateSheet date={date} onClose={() => setTemplatesOpen(false)} />}
    </div>
  );
}
