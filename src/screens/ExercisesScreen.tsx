import { useMemo, useRef, useState } from 'react';
import ConfirmButton from '../components/ConfirmButton';
import ExerciseEditorSheet, { type ExerciseDraft } from '../components/ExerciseEditorSheet';
import TemplateEditor, { type TemplateDraft } from '../components/TemplateEditor';
import { todayISO } from '../lib/dates';
import { allTags, exerciseName, hasTag, hiddenExerciseIds } from '../lib/exercises';
import { allLoggedSets } from '../lib/stats';
import { useActions, useApp } from '../lib/store';

type SortMode = 'az' | 'new';

export default function ExercisesScreen({ onGoToLog }: { onGoToLog: () => void }) {
  const { data } = useApp();
  const actions = useActions();
  const [editing, setEditing] = useState<TemplateDraft | null>(null);
  const [exEditing, setExEditing] = useState<ExerciseDraft | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('az');
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(text: string) {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }

  const usedIds = useMemo(() => new Set(allLoggedSets(data).map((s) => s.exerciseId)), [data]);
  const hidden = useMemo(() => hiddenExerciseIds(data), [data]);
  const tags = useMemo(() => allTags(data), [data]);
  const templates = [...data.templates].sort((a, b) => a.name.localeCompare(b.name));

  const list = useMemo(() => {
    const filtered = tagFilter
      ? data.customExercises.filter((e) => hasTag(e, tagFilter))
      : [...data.customExercises];
    return filtered.sort((a, b) =>
      sortMode === 'az'
        ? a.name.localeCompare(b.name)
        : (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );
  }, [data.customExercises, tagFilter, sortMode]);

  function useToday(templateId: string) {
    const tpl = data.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    actions.applyTemplate(todayISO(), tpl.exerciseIds);
    onGoToLog();
  }

  function removeExercise(id: string, name: string) {
    if (usedIds.has(id)) {
      showNotice(`"${name}" has logged sets, so it can't be deleted. Hide it instead.`);
      return;
    }
    actions.removeCustomExercise(id);
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
                <ConfirmButton
                  className="icon-btn small"
                  confirmLabel="Delete?"
                  ariaLabel={`Delete ${t.name}`}
                  onConfirm={() => actions.deleteTemplate(t.id)}
                >
                  ✕
                </ConfirmButton>
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
          <button
            type="button"
            className="btn accent block"
            style={{ marginBottom: 10 }}
            onClick={() => setExEditing({ id: null, name: '', tags: [] })}
          >
            + New exercise
          </button>

          {tags.length > 0 && (
            <div className="chips-row" style={{ marginBottom: 8 }}>
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
              <span className="chip-divider" />
              <button
                type="button"
                className={`chip small${sortMode === 'az' ? ' active' : ''}`}
                onClick={() => setSortMode('az')}
              >
                A–Z
              </button>
              <button
                type="button"
                className={`chip small${sortMode === 'new' ? ' active' : ''}`}
                onClick={() => setSortMode('new')}
              >
                Newest
              </button>
            </div>
          )}

          {notice && <div className="inline-notice">{notice}</div>}
          {data.customExercises.length === 0 && (
            <div className="empty">Nothing here yet — add your first lift above.</div>
          )}
          {list.length === 0 && data.customExercises.length > 0 && (
            <div className="empty">No lifts with this tag.</div>
          )}
          {list.map((e) => {
            const isHidden = hidden.has(e.id);
            return (
              <div key={e.id} className={`list-row static${isHidden ? ' muted' : ''}`}>
                <span className="ex-info">
                  <span>{e.name}</span>
                  {(e.tags ?? []).length > 0 && (
                    <span className="ex-tags">
                      {(e.tags ?? []).map((t) => (
                        <span key={t} className="tag mini">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="icon-btn small"
                    aria-label={`Edit ${e.name}`}
                    onClick={() => setExEditing({ id: e.id, name: e.name, tags: [...(e.tags ?? [])] })}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => actions.setExerciseHidden(e.id, !isHidden)}
                  >
                    {isHidden ? 'Show' : 'Hide'}
                  </button>
                  {usedIds.has(e.id) ? (
                    <button
                      type="button"
                      className="icon-btn small"
                      onClick={() => removeExercise(e.id, e.name)}
                      aria-label={`Delete ${e.name}`}
                    >
                      ✕
                    </button>
                  ) : (
                    <ConfirmButton
                      className="icon-btn small"
                      confirmLabel="Delete?"
                      ariaLabel={`Delete ${e.name}`}
                      onConfirm={() => removeExercise(e.id, e.name)}
                    >
                      ✕
                    </ConfirmButton>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      </div>
      {editing && <TemplateEditor initial={editing} onClose={() => setEditing(null)} />}
      {exEditing && <ExerciseEditorSheet initial={exEditing} onClose={() => setExEditing(null)} />}
    </div>
  );
}
