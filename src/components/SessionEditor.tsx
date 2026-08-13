import { useState } from 'react';
import { useActions, useApp } from '../lib/store';
import ExerciseBlockCard from './ExerciseBlockCard';
import ExercisePicker from './ExercisePicker';

export default function SessionEditor({ date }: { date: string }) {
  const { data } = useApp();
  const actions = useActions();
  const [pickerOpen, setPickerOpen] = useState(false);

  const session = data.sessions.find((s) => s.date === date);
  const blocks = session?.blocks ?? [];

  return (
    <div className="stack">
      {blocks.map((b) => (
        <ExerciseBlockCard key={b.id} date={date} block={b} />
      ))}
      {blocks.length === 0 && (
        <div className="card empty">No lifts logged for this day yet. Add your first exercise.</div>
      )}
      <button type="button" className="btn accent block" onClick={() => setPickerOpen(true)}>
        + Add exercise
      </button>
      {pickerOpen && (
        <ExercisePicker
          onClose={() => setPickerOpen(false)}
          onPick={(exerciseId) => {
            actions.addBlock(date, exerciseId);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
