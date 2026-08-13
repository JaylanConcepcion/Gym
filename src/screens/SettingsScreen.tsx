import { useRef, useState, type ChangeEvent } from 'react';
import { CM_PER_IN } from '../lib/cardio';
import { formatRelativeTime, todayISO } from '../lib/dates';
import { TOKEN_URL } from '../lib/gist';
import { normalizeData } from '../lib/storage';
import { useActions, useApp } from '../lib/store';
import { useSync } from '../lib/sync';
import { roundTo } from '../lib/units';
import type { Units } from '../lib/types';

export default function SettingsScreen() {
  const { data } = useApp();
  const actions = useActions();
  const sync = useSync();
  const units = data.settings.units;
  const [tokenInput, setTokenInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const heightUnit = units === 'lb' ? 'in' : 'cm';
  const [heightStr, setHeightStr] = useState(() =>
    data.profile.heightCm == null
      ? ''
      : String(roundTo(units === 'lb' ? data.profile.heightCm / CM_PER_IN : data.profile.heightCm, 0))
  );
  const [ageStr, setAgeStr] = useState(() => (data.profile.age == null ? '' : String(data.profile.age)));
  const [sex, setSex] = useState<'m' | 'f' | null>(data.profile.sex);
  const [profileSaved, setProfileSaved] = useState(false);

  function saveProfile() {
    const h = parseFloat(heightStr.replace(',', '.'));
    const a = parseInt(ageStr, 10);
    actions.setProfile({
      heightCm: Number.isFinite(h) && h > 0 ? (units === 'lb' ? h * CM_PER_IN : h) : null,
      age: Number.isFinite(a) && a > 0 ? a : null,
      sex
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function connectSync() {
    const ok = await sync.connect(tokenInput);
    if (ok) setTokenInput('');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pl-tracker-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyData() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data));
      window.alert('Backup JSON copied to clipboard.');
    } catch {
      window.alert('Could not access the clipboard.');
    }
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = normalizeData(JSON.parse(text));
        if (!parsed) {
          window.alert('That file is not a valid backup.');
          return;
        }
        const sets = parsed.sessions.reduce(
          (n, s) => n + s.blocks.reduce((m, b) => m + b.sets.length, 0),
          0
        );
        if (
          window.confirm(
            `Replace current data with this backup? (${parsed.sessions.length} sessions, ${sets} sets, ${parsed.bodyWeights.length} weigh-ins)`
          )
        ) {
          actions.importData(parsed);
        }
      } catch {
        window.alert('Could not read that file.');
      }
    });
  }

  function clearAll() {
    const extra = sync.enabled ? ' Sync will be disconnected on this device first.' : '';
    if (
      window.confirm(`Delete ALL sessions, bodyweight entries and custom exercises on this device?${extra}`) &&
      window.confirm('Really sure? This cannot be undone. (Export a backup first!)')
    ) {
      if (sync.enabled) sync.disconnect();
      actions.clearAll();
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>
      <div className="stack">
        <section className="card">
          <h3>Sync between devices</h3>
          {sync.enabled ? (
            <>
              <div className="sync-status">
                <span
                  className={`status-dot ${
                    sync.status === 'error' ? 'err' : sync.status === 'syncing' ? 'busy' : 'ok'
                  }`}
                />
                <div>
                  <div className="sync-line">
                    Connected as <strong>{sync.login ?? 'GitHub'}</strong>
                  </div>
                  <div className="sub dim">
                    {sync.status === 'syncing'
                      ? 'Syncing…'
                      : sync.lastSyncAt
                        ? `Last synced ${formatRelativeTime(sync.lastSyncAt)}`
                        : 'Not synced yet'}
                  </div>
                </div>
              </div>
              {sync.error && <div className="sync-error">{sync.error}</div>}
              <div className="row wrap" style={{ marginTop: 10 }}>
                <button type="button" className="btn ghost" onClick={sync.syncNow}>
                  Sync now
                </button>
                <button type="button" className="btn ghost danger" onClick={sync.disconnect}>
                  Disconnect
                </button>
              </div>
              <div className="sub dim" style={{ marginTop: 8 }}>
                To link another device, paste the same token there. Your log lives in a private gist
                only your GitHub account can see.
              </div>
            </>
          ) : (
            <>
              <div className="sub" style={{ marginBottom: 10 }}>
                Keep your iPhone and Mac showing the same log. Free, using a private GitHub Gist on
                your own account. Both devices still work offline; they reconcile whenever online.
              </div>
              <div className="sub dim" style={{ marginBottom: 6 }}>
                1 · Create a token (pre-filled with only gist access; choose “No expiration”, then
                Generate and copy it):
              </div>
              <a className="btn ghost small" href={TOKEN_URL} target="_blank" rel="noreferrer">
                Open GitHub token page
              </a>
              <div className="sub dim" style={{ margin: '10px 0 6px' }}>
                2 · Paste the token and connect (same token on every device):
              </div>
              <div className="row">
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="ghp_…"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn accent"
                  disabled={!tokenInput.trim() || sync.status === 'syncing'}
                  onClick={() => void connectSync()}
                >
                  {sync.status === 'syncing' ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              {sync.error && <div className="sync-error">{sync.error}</div>}
            </>
          )}
        </section>

        <section className="card">
          <h3>Profile</h3>
          <div className="sub dim" style={{ marginBottom: 10 }}>
            Used together with your logged bodyweight to estimate cardio calories.
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="field">
              <span>Height ({heightUnit})</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder={units === 'lb' ? '70' : '178'}
                value={heightStr}
                onChange={(e) => setHeightStr(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Age</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="25"
                value={ageStr}
                onChange={(e) => setAgeStr(e.target.value)}
              />
            </label>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <span>Sex (for the calorie formula)</span>
            <div className="seg">
              {(
                [
                  { v: 'm', label: 'Male' },
                  { v: 'f', label: 'Female' },
                  { v: null, label: 'Skip' }
                ] as Array<{ v: 'm' | 'f' | null; label: string }>
              ).map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={`seg-btn${sex === o.v ? ' active' : ''}`}
                  onClick={() => setSex(o.v)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn ghost" onClick={saveProfile}>
            {profileSaved ? 'Saved ✓' : 'Save profile'}
          </button>
        </section>

        <section className="card">
          <h3>Units</h3>
          <div className="seg">
            {(['lb', 'kg'] as Units[]).map((u) => (
              <button
                key={u}
                type="button"
                className={`seg-btn${units === u ? ' active' : ''}`}
                onClick={() => actions.setUnits(u)}
              >
                {u}
              </button>
            ))}
          </div>
          <div className="sub dim">Existing entries convert automatically — history is stored unit-agnostic.</div>
        </section>

        <section className="card">
          <h3>Backup</h3>
          <div className="sub dim" style={{ marginBottom: 10 }}>
            Export a backup now and then so you never lose training history — especially if you're
            not using sync.
          </div>
          <div className="row wrap">
            <button type="button" className="btn ghost" onClick={exportData}>
              Export file
            </button>
            <button type="button" className="btn ghost" onClick={copyData}>
              Copy JSON
            </button>
            <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
              Import file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={onImportFile}
            />
          </div>
        </section>

        <section className="card danger-zone">
          <h3>Danger zone</h3>
          <button type="button" className="btn ghost danger" onClick={clearAll}>
            Clear all data
          </button>
        </section>

        <div className="sub dim about">
          Powerlifting Tracker v{__APP_VERSION__} · e1RM uses the RTS-style RPE chart (Epley beyond
          12 effective reps).
        </div>
      </div>
    </div>
  );
}
