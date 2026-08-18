import { useMemo, useRef, useState, type ReactNode } from 'react';
import ConfirmButton from '../components/ConfirmButton';
import ExerciseEditorSheet, { type ExerciseDraft } from '../components/ExerciseEditorSheet';
import TemplateEditor, { type TemplateDraft } from '../components/TemplateEditor';
import { todayISO } from '../lib/dates';
import {
  allTags,
  categoryOf,
  exerciseName,
  hasTag,
  hiddenExerciseIds,
  PRESET_CATEGORIES
} from '../lib/exercises';
import { allLoggedSets } from '../lib/stats';
import { useActions, useApp } from '../lib/store';
import type { ExerciseDef } from '../lib/types';

type SortMode = 'az' | 'new' | 'cat';

export default function ExercisesScreen({ onGoToLog }: { onGoToLog: () => void }) {
  const { data } = useApp();
  const actions = useActions();
  const [editing, setEditing] = useState<TemplateDraft | null>(null);
  const [exEditing, setExEditing] = useState<ExerciseDraft | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('cat');
  const [expandedTpl, setExpandedTpl] = useState<string | null>(null);
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
      sortMode === 'new'
        ? (b.createdAt ?? 0) - (a.createdAt ?? 0)
        : a.name.localeCompare(b.name)
    );
  }, [data.customExercises, tagFilter, sortMode]);

  const groups = useMemo(() => {
    if (sortMode !== 'cat') return null;
    const m = new Map<string, ExerciseDef[]>();
    for (const e of list) {
      const c = categoryOf(e);
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(e);
    }
    return m;
  }, [list, sortMode]);

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

  function renderRow(e: ExerciseDef): ReactNode {
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
          {templates.map((t) => {
            const open = expandedTpl === t.id;
            return (
              <div key={t.id} className="tpl-block">
                <div className="tpl-static">
                  <button
                    type="button"
                    className="tpl-info"
                    onClick={() => setExpandedTpl(open ? null : t.id)}
                    aria-expanded={open}
                  >
                    <span className="tpl-name">{t.name}</span>
                    <span className="sub dim">
                      {t.exerciseIds.length} lift{t.exerciseIds.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  <span className="row" style={{ gap: 6, flex: 'none' }}>
                    <button type="button" className="btn accent small" onClick={() => useToday(t.id)}>
                      Use today
                    </button>
                    <button
                      type="button"
                      className="icon-btn small"
                      aria-label={open ? `Collapse ${t.name}` : `Expand ${t.name}`}
                      onClick={() => setExpandedTpl(open ? null : t.id)}
                    >
                      {open ? '▴' : '▾'}
                    </button>
                  </span>
                </div>
                {open && (
                  <div className="tpl-detail">
                    <div className="sub">
                      {t.exerciseIds.map((id) => exerciseName(data, id)).join(' · ')}
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() =>
                          setEditing({ id: t.id, name: t.name, selected: [...t.exerciseIds] })
                        }
                      >
                        ✎ Edit day
                      </button>
                      <ConfirmButton
                        className="btn ghost small danger"
                        confirmLabel="Tap again to delete"
                        ariaLabel={`Delete ${t.name}`}
                        onConfirm={() => actions.deleteTemplate(t.id)}
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

          <div className="chips-row" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={`chip small${sortMode === 'cat' ? ' active' : ''}`}
              onClick={() => setSortMode('cat')}
            >
              By category
            </button>
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
            {tags.length > 0 && <span className="chip-divider" />}
            {tags.length > 0 && (
              <button
                type="button"
                className={`chip small${tagFilter == null ? ' active' : ''}`}
                onClick={() => setTagFilter(null)}
              >
                All
              </button>
            )}
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

          {notice && <div className="inline-notice">{notice}</div>}
          {data.customExercises.length === 0 && (
            <div className="empty">
              Nothing here yet — add your first lift above. Tag lifts with a body part (Back,
              Biceps, Triceps, Shoulders, Chest, Legs) to sort by category.
            </div>
          )}
          {list.length === 0 && data.customExercises.length > 0 && (
            <div className="empty">No lifts with this tag.</div>
          )}
          {sortMode === 'cat' && groups
            ? [...PRESET_CATEGORIES, 'Other']
                .filter((c) => groups.has(c))
                .map((c) => (
                  <div key={c}>
                    <div className="cat-head">{c}</div>
                    {groups.get(c)!.map((e) => renderRow(e))}
                  </div>
                ))
            : list.map((e) => renderRow(e))}
        </section>
      </div>
      {editing && <TemplateEditor initial={editing} onClose={() => setEditing(null)} />}
      {exEditing && <ExerciseEditorSheet initial={exEditing} onClose={() => setExEditing(null)} />}
    </div>
  );
}
