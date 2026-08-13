import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { addDaysISO, formatMonthLabel, formatShortDate, todayISO } from '../lib/dates';
import { exerciseName } from '../lib/exercises';
import {
  bodyWeightSeries,
  exercisesWithData,
  prRecords,
  tonnageByPeriod,
  topSetByDate,
  topSetE1rmByPeriod,
  type Period
} from '../lib/stats';
import { useApp } from '../lib/store';
import { formatWeight, formatWeightValue, kgToDisplay, roundTo } from '../lib/units';
import type { AppData, Units } from '../lib/types';

const RANGES = [
  { id: '8w', label: '8W', days: 56 },
  { id: '6m', label: '6M', days: 183 },
  { id: 'all', label: 'All', days: null }
] as const;

type RangeId = (typeof RANGES)[number]['id'];

const PERIODS: Array<{ id: Period; label: string; noun: string }> = [
  { id: 'day', label: 'Days', noun: 'day' },
  { id: 'week', label: 'Weeks', noun: 'week' },
  { id: 'month', label: 'Months', noun: 'month' }
];

const PALETTE = ['#ef4444', '#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#22d3ee', '#e879f9', '#fb7185'];

interface ChartFlags {
  e1rm: boolean;
  top: boolean;
  volume: boolean;
  prs: boolean;
  bw: boolean;
}

interface ProgressPrefs {
  selected: string[];
  charts: ChartFlags;
  period: Period;
  range: RangeId;
}

const PREFS_KEY = 'pl-tracker/progress-ui';
const DEFAULT_FLAGS: ChartFlags = { e1rm: true, top: true, volume: true, prs: true, bw: true };

function loadPrefs(): Partial<ProgressPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<ProgressPrefs>) : {};
  } catch {
    return {};
  }
}

const TOOLTIP_STYLES = {
  contentStyle: {
    background: '#1c1f26',
    border: '1px solid #2a2f38',
    borderRadius: 10,
    fontSize: 12,
    color: '#f2f3f5'
  },
  labelStyle: { color: '#9aa1ac' }
};

const AXIS_TICK = { fill: '#9aa1ac', fontSize: 11 };

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <section className="card chart-card">
      <h3>{title}</h3>
      <div className="chart-holder">
        <ResponsiveContainer width="100%" height={220}>
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AddLiftSheet({
  data,
  candidates,
  onPick,
  onClose
}: {
  data: AppData;
  candidates: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = candidates
    .map((id) => ({ id, name: exerciseName(data, id) }))
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Add a lift to the graphs</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          className="input"
          placeholder="Search lifts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="sheet-list">
          {list.length === 0 && <div className="empty">No matching lifts.</div>}
          {list.map((e) => (
            <button key={e.id} type="button" className="list-row" onClick={() => onPick(e.id)}>
              <span>{e.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProgressScreen() {
  const { data } = useApp();
  const units: Units = data.settings.units;

  const withData = useMemo(() => exercisesWithData(data), [data]);
  const prefs = useMemo(loadPrefs, []);

  const [selected, setSelected] = useState<string[]>(prefs.selected ?? []);
  const [flags, setFlags] = useState<ChartFlags>({ ...DEFAULT_FLAGS, ...prefs.charts });
  const [period, setPeriod] = useState<Period>(prefs.period ?? 'week');
  const [rangeId, setRangeId] = useState<RangeId>(prefs.range ?? 'all');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ selected, charts: flags, period, range: rangeId } satisfies ProgressPrefs)
      );
    } catch {
      // Preference persistence is best-effort only.
    }
  }, [selected, flags, period, rangeId]);

  const known = useMemo(() => {
    const s = new Set(data.customExercises.map((e) => e.id));
    for (const id of withData) s.add(id);
    return s;
  }, [data.customExercises, withData]);

  const selection = useMemo(() => {
    const valid = selected.filter((id) => known.has(id));
    if (valid.length > 0) return valid;
    return withData.length > 0 ? [withData[0]] : [];
  }, [selected, known, withData]);

  const chipIds = useMemo(() => {
    const ids = [...withData];
    for (const id of selection) if (!ids.includes(id)) ids.push(id);
    return ids;
  }, [withData, selection]);

  const candidates = useMemo(
    () => [...known].filter((id) => !selection.includes(id)),
    [known, selection]
  );

  function toggleLift(id: string) {
    setSelected(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);
  }

  const rangeDays = RANGES.find((r) => r.id === rangeId)?.days ?? null;
  const cutoff = rangeDays == null ? null : addDaysISO(todayISO(), -rangeDays);
  const periodNoun = PERIODS.find((p) => p.id === period)?.noun ?? 'week';
  const labelFor = (key: string) => (period === 'month' ? formatMonthLabel(key) : formatShortDate(key));
  const colorFor = (idx: number) => PALETTE[idx % PALETTE.length];

  const e1rmSeries = useMemo(
    () =>
      selection.map((id) => ({
        id,
        points: topSetE1rmByPeriod(data, id, period).filter((p) => !cutoff || p.key >= cutoff)
      })),
    [data, selection, period, cutoff]
  );

  const combinedE1rm = useMemo(() => {
    const keys = new Set<string>();
    for (const s of e1rmSeries) for (const p of s.points) keys.add(p.key);
    return [...keys].sort().map((k) => {
      const row: Record<string, number | string> = { label: labelFor(k) };
      for (const s of e1rmSeries) {
        const p = s.points.find((pt) => pt.key === k);
        if (p) row[s.id] = roundTo(kgToDisplay(p.e1rmKg, units), 1);
      }
      return row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e1rmSeries, units, period]);

  const bw = useMemo(
    () => bodyWeightSeries(data).filter((e) => !cutoff || e.date >= cutoff),
    [data, cutoff]
  );
  const bwData = bw.map((e) => ({
    label: formatShortDate(e.date),
    weight: roundTo(kgToDisplay(e.weightKg, units), 1),
    avg: roundTo(kgToDisplay(e.avgKg, units), 1)
  }));

  const single = selection.length === 1 ? selection[0] : null;
  const singlePrs = useMemo(() => (single ? prRecords(data, single) : null), [data, single]);
  const singleTrend = single ? (e1rmSeries[0]?.points ?? []) : [];
  const latest = singleTrend.length > 0 ? singleTrend[singleTrend.length - 1] : null;
  const prior = singleTrend.length > 1 ? singleTrend[singleTrend.length - 2] : null;
  const deltaKg = latest && prior ? latest.e1rmKg - prior.e1rmKg : null;

  const flagChips: Array<{ id: keyof ChartFlags; label: string }> = [
    { id: 'e1rm', label: 'e1RM' },
    { id: 'top', label: 'Top set' },
    { id: 'volume', label: 'Volume' },
    { id: 'prs', label: 'PRs' },
    { id: 'bw', label: 'Bodyweight' }
  ];

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Progress</h1>
      </header>

      {withData.length === 0 && selection.length === 0 ? (
        <div className="card empty">Log some sets and your strength charts will show up here.</div>
      ) : (
        <div className="stack">
          <div className="chips-row">
            {chipIds.map((id) => (
              <button
                key={id}
                type="button"
                className={`chip${selection.includes(id) ? ' active' : ''}`}
                onClick={() => toggleLift(id)}
              >
                {exerciseName(data, id)}
              </button>
            ))}
            <button type="button" className="chip" onClick={() => setAddOpen(true)}>
              + Add lift
            </button>
          </div>

          <div className="chips-row">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip small${period === p.id ? ' active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
            <span className="chip-divider" />
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`chip small${rangeId === r.id ? ' active' : ''}`}
                onClick={() => setRangeId(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="chips-row">
            <span className="sub dim" style={{ alignSelf: 'center', flex: 'none' }}>
              Graphs:
            </span>
            {flagChips.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip small${flags[f.id] ? ' active' : ''}`}
                onClick={() => setFlags({ ...flags, [f.id]: !flags[f.id] })}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selection.length === 0 && (
            <div className="card empty">Select or add a lift above to see its graphs.</div>
          )}

          {single && flags.e1rm && (
            <div className="stat-grid">
              <div className="card stat">
                <div className="stat-label">Latest e1RM ({periodNoun})</div>
                <div className="stat-value">{latest ? formatWeight(latest.e1rmKg, units, 0) : '—'}</div>
                {deltaKg != null && (
                  <div className={`delta ${deltaKg >= 0 ? 'up' : 'down'}`}>
                    {deltaKg >= 0 ? '▲' : '▼'} {formatWeightValue(Math.abs(deltaKg), units)} {units} vs
                    prior {periodNoun}
                  </div>
                )}
              </div>
              <div className="card stat">
                <div className="stat-label">All-time best e1RM</div>
                <div className="stat-value">
                  {singlePrs?.bestE1rm ? formatWeight(singlePrs.bestE1rm.e1rmKg, units, 0) : '—'}
                </div>
                {singlePrs?.bestE1rm && (
                  <div className="sub dim">
                    {formatWeightValue(singlePrs.bestE1rm.weightKg, units)} × {singlePrs.bestE1rm.reps}
                    {singlePrs.bestE1rm.rpe != null && ` @${singlePrs.bestE1rm.rpe}`} ·{' '}
                    {formatShortDate(singlePrs.bestE1rm.date)}
                  </div>
                )}
              </div>
            </div>
          )}

          {flags.e1rm && selection.length > 0 && (
            <ChartCard title={`Estimated 1RM — top set per ${periodNoun}`}>
              <LineChart data={combinedE1rm} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#23262e" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2f38' }}
                  minTickGap={24}
                />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48} />
                <Tooltip {...TOOLTIP_STYLES} />
                {selection.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />}
                {selection.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={exerciseName(data, id)}
                    unit={` ${units}`}
                    stroke={colorFor(i)}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: colorFor(i), strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ChartCard>
          )}

          {flags.top &&
            selection.map((id, i) => {
              const tops = topSetByDate(data, id)
                .filter((s) => !cutoff || s.date >= cutoff)
                .map((s) => ({
                  label: formatShortDate(s.date),
                  value: roundTo(kgToDisplay(s.weightKg, units), 1)
                }));
              if (tops.length === 0) return null;
              return (
                <ChartCard key={id} title={`Top set — ${exerciseName(data, id)}`}>
                  <LineChart data={tops} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#23262e" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2f38' }}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      width={48}
                    />
                    <Tooltip {...TOOLTIP_STYLES} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Top set"
                      unit={` ${units}`}
                      stroke={colorFor(i)}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: colorFor(i), strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartCard>
              );
            })}

          {flags.volume &&
            selection.map((id, i) => {
              const tonnage = tonnageByPeriod(data, id, period)
                .filter((t) => !cutoff || t.key >= cutoff)
                .map((t) => ({
                  label: labelFor(t.key),
                  value: Math.round(kgToDisplay(t.tonnageKg, units))
                }));
              if (tonnage.length === 0) return null;
              return (
                <ChartCard key={id} title={`Volume per ${periodNoun} — ${exerciseName(data, id)}`}>
                  <BarChart data={tonnage} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#23262e" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2f38' }}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => (v >= 1000 ? `${roundTo(v / 1000, 1)}k` : String(v))}
                    />
                    <Tooltip {...TOOLTIP_STYLES} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar
                      dataKey="value"
                      name="Volume"
                      unit={` ${units}`}
                      fill={colorFor(i)}
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ChartCard>
              );
            })}

          {flags.prs &&
            selection.map((id) => {
              const prs = prRecords(data, id);
              if (prs.repPRs.length === 0) return null;
              return (
                <section key={id} className="card">
                  <h3>Rep PRs — {exerciseName(data, id)}</h3>
                  {prs.bestSingle && (
                    <div className="sub" style={{ marginBottom: 8 }}>
                      Best single: <strong>{formatWeight(prs.bestSingle.weightKg, units)}</strong>
                      {prs.bestSingle.rpe != null && ` @${prs.bestSingle.rpe}`} ·{' '}
                      {formatShortDate(prs.bestSingle.date)}
                    </div>
                  )}
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Reps</th>
                        <th>Weight</th>
                        <th>e1RM</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prs.repPRs.map((s) => (
                        <tr key={s.reps}>
                          <td>{s.reps}</td>
                          <td>
                            {formatWeightValue(s.weightKg, units)} {units}
                            {s.rpe != null && <span className="dim"> @{s.rpe}</span>}
                          </td>
                          <td>{formatWeightValue(s.e1rmKg, units, 0)}</td>
                          <td className="dim">{formatShortDate(s.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
        </div>
      )}

      {flags.bw && (
        <section className="stack bw-section">
          <h2 className="section-title">Bodyweight</h2>
          {bwData.length === 0 ? (
            <div className="card empty">No bodyweight entries yet — add one from the Log tab.</div>
          ) : (
            <ChartCard title="Bodyweight — with 7-day average">
              <LineChart data={bwData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#23262e" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2f38' }}
                  minTickGap={24}
                />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48} />
                <Tooltip {...TOOLTIP_STYLES} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Weigh-in"
                  unit={` ${units}`}
                  stroke="#5b6472"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="7-day avg"
                  unit={` ${units}`}
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartCard>
          )}
        </section>
      )}

      {addOpen && (
        <AddLiftSheet
          data={data}
          candidates={candidates}
          onPick={(id) => {
            setSelected([...selection, id]);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
