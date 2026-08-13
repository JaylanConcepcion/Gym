import { useMemo, useState, type ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { addDaysISO, formatShortDate, todayISO } from '../lib/dates';
import { colorForExercise, exerciseName } from '../lib/exercises';
import {
  bodyWeightSeries,
  exercisesWithData,
  prRecords,
  topSetByDate,
  weeklyBestE1rm,
  weeklyTonnage
} from '../lib/stats';
import { useApp } from '../lib/store';
import { formatWeight, formatWeightValue, kgToDisplay, roundTo } from '../lib/units';

const RANGES = [
  { id: '8w', label: '8W', days: 56 },
  { id: '6m', label: '6M', days: 183 },
  { id: 'all', label: 'All', days: null }
] as const;

type RangeId = (typeof RANGES)[number]['id'];

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

export default function ProgressScreen() {
  const { data } = useApp();
  const units = data.settings.units;

  const withData = useMemo(() => exercisesWithData(data), [data]);
  const [selId, setSelId] = useState<string | null>(null);
  const [rangeId, setRangeId] = useState<RangeId>('all');

  const active = selId && withData.includes(selId) ? selId : (withData[0] ?? null);
  const rangeDays = RANGES.find((r) => r.id === rangeId)?.days ?? null;
  const cutoff = rangeDays == null ? null : addDaysISO(todayISO(), -rangeDays);

  const weekly = useMemo(
    () => (active ? weeklyBestE1rm(data, active).filter((p) => !cutoff || p.week >= cutoff) : []),
    [data, active, cutoff]
  );
  const tops = useMemo(
    () => (active ? topSetByDate(data, active).filter((s) => !cutoff || s.date >= cutoff) : []),
    [data, active, cutoff]
  );
  const tonnage = useMemo(
    () => (active ? weeklyTonnage(data, active).filter((t) => !cutoff || t.week >= cutoff) : []),
    [data, active, cutoff]
  );
  const bw = useMemo(
    () => bodyWeightSeries(data).filter((e) => !cutoff || e.date >= cutoff),
    [data, cutoff]
  );
  const prs = useMemo(() => (active ? prRecords(data, active) : null), [data, active]);

  const color = active ? colorForExercise(exerciseName(data, active)) : '#f97316';

  const weeklyData = weekly.map((p) => ({
    label: formatShortDate(p.week),
    value: roundTo(kgToDisplay(p.e1rmKg, units), 1)
  }));
  const topsData = tops.map((s) => ({
    label: formatShortDate(s.date),
    value: roundTo(kgToDisplay(s.weightKg, units), 1)
  }));
  const tonnageData = tonnage.map((t) => ({
    label: formatShortDate(t.week),
    value: Math.round(kgToDisplay(t.tonnageKg, units))
  }));
  const bwData = bw.map((e) => ({
    label: formatShortDate(e.date),
    weight: roundTo(kgToDisplay(e.weightKg, units), 1),
    avg: roundTo(kgToDisplay(e.avgKg, units), 1)
  }));

  const latest = weekly.length > 0 ? weekly[weekly.length - 1] : null;
  const prior = weekly.length > 1 ? weekly[weekly.length - 2] : null;
  const deltaKg = latest && prior ? latest.e1rmKg - prior.e1rmKg : null;

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Progress</h1>
      </header>

      {withData.length === 0 ? (
        <div className="card empty">Log some sets and your strength charts will show up here.</div>
      ) : (
        <div className="stack">
          <div className="chips-row">
            {withData.map((id) => (
              <button
                key={id}
                type="button"
                className={`chip${active === id ? ' active' : ''}`}
                onClick={() => setSelId(id)}
              >
                {exerciseName(data, id)}
              </button>
            ))}
          </div>
          <div className="chips-row">
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

          <div className="stat-grid">
            <div className="card stat">
              <div className="stat-label">Latest weekly e1RM</div>
              <div className="stat-value">{latest ? formatWeight(latest.e1rmKg, units, 0) : '—'}</div>
              {deltaKg != null && (
                <div className={`delta ${deltaKg >= 0 ? 'up' : 'down'}`}>
                  {deltaKg >= 0 ? '▲' : '▼'} {formatWeightValue(Math.abs(deltaKg), units)} {units} vs
                  prior week
                </div>
              )}
            </div>
            <div className="card stat">
              <div className="stat-label">All-time best e1RM</div>
              <div className="stat-value">
                {prs?.bestE1rm ? formatWeight(prs.bestE1rm.e1rmKg, units, 0) : '—'}
              </div>
              {prs?.bestE1rm && (
                <div className="sub dim">
                  {formatWeightValue(prs.bestE1rm.weightKg, units)} × {prs.bestE1rm.reps}
                  {prs.bestE1rm.rpe != null && ` @${prs.bestE1rm.rpe}`} ·{' '}
                  {formatShortDate(prs.bestE1rm.date)}
                </div>
              )}
            </div>
          </div>

          <ChartCard title="Estimated 1RM — weekly best">
            <LineChart data={weeklyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
                dataKey="value"
                name="e1RM"
                unit={` ${units}`}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartCard>

          <ChartCard title="Top set weight — per session">
            <LineChart data={topsData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
                dataKey="value"
                name="Top set"
                unit={` ${units}`}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="1 0"
                dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartCard>

          <ChartCard title="Weekly volume">
            <BarChart data={tonnageData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
              <Bar dataKey="value" name="Volume" unit={` ${units}`} fill={color} radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartCard>

          {prs && prs.repPRs.length > 0 && (
            <section className="card">
              <h3>Rep PRs — {active ? exerciseName(data, active) : ''}</h3>
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
          )}
        </div>
      )}

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
    </div>
  );
}
