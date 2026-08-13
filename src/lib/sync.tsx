import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createGist, findExistingGist, readGist, validateToken, writeGist } from './gist';
import { canonicalize, mergeData } from './merge';
import { normalizeData } from './storage';
import { useActions, useApp } from './store';
import type { AppData } from './types';

const LS_TOKEN = 'pl-tracker/sync-token';
const LS_GIST = 'pl-tracker/sync-gist';
const LS_LOGIN = 'pl-tracker/sync-login';
const LS_LAST = 'pl-tracker/sync-last';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncContextValue {
  enabled: boolean;
  login: string | null;
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  connect: (token: string) => Promise<boolean>;
  disconnect: () => void;
  syncNow: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data } = useApp();
  const actions = useActions();

  const tokenRef = useRef<string | null>(localStorage.getItem(LS_TOKEN));
  const gistIdRef = useRef<string | null>(localStorage.getItem(LS_GIST));
  const [enabled, setEnabled] = useState(() => tokenRef.current != null && gistIdRef.current != null);
  const [login, setLogin] = useState<string | null>(localStorage.getItem(LS_LOGIN));
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const v = localStorage.getItem(LS_LAST);
    return v ? Number(v) : null;
  });

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const lastAttemptRef = useRef(0);
  /** Canonical form of the data as of the last completed sync; used to detect real local changes. */
  const lastSyncedCanonRef = useRef<string | null>(null);

  const doSync = useCallback(async () => {
    const token = tokenRef.current;
    const gistId = gistIdRef.current;
    if (!token || !gistId) return;
    if (syncingRef.current) {
      pendingRef.current = true;
      return;
    }
    syncingRef.current = true;
    lastAttemptRef.current = Date.now();
    setStatus('syncing');
    setError(null);
    try {
      const remoteStr = await readGist(token, gistId);
      let remote: AppData | null = null;
      if (remoteStr != null) {
        try {
          remote = normalizeData(JSON.parse(remoteStr));
        } catch {
          remote = null;
        }
      }

      // Merge inside the reducer (against the true latest state) rather than
      // replacing state with a snapshot — edits made while this sync was in
      // flight survive. If our pushed content misses such a late edit, the
      // change-debounce effect notices the canonical mismatch and runs one
      // more sync round, which converges (merge is idempotent).
      const local = dataRef.current;
      if (remote && canonicalize(mergeData(local, remote)) !== canonicalize(local)) {
        actions.mergeRemote(remote);
      }

      const finalData = remote ? mergeData(local, remote) : local;
      const finalCanon = canonicalize(finalData);
      const remoteCanon = remote ? canonicalize(remote) : null;
      if (finalCanon !== remoteCanon) {
        try {
          await writeGist(token, gistId, finalCanon);
        } catch (e) {
          // Gist was deleted on github.com — recreate it and carry on.
          if (String(e).includes('404')) {
            const newId = await createGist(token, finalCanon);
            gistIdRef.current = newId;
            localStorage.setItem(LS_GIST, newId);
          } else {
            throw e;
          }
        }
      }

      lastSyncedCanonRef.current = finalCanon;
      const now = Date.now();
      setLastSyncAt(now);
      localStorage.setItem(LS_LAST, String(now));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Sync failed — will retry.');
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void doSync();
      }
    }
  }, [actions]);

  // Sync on startup / reconnect.
  useEffect(() => {
    if (enabled) void doSync();
  }, [enabled, doSync]);

  // Push local edits shortly after they happen.
  useEffect(() => {
    if (!enabled) return;
    if (canonicalize(data) === lastSyncedCanonRef.current) return;
    const t = setTimeout(() => void doSync(), 2500);
    return () => clearTimeout(t);
  }, [data, enabled, doSync]);

  // Pull when the app comes back to the foreground or back online.
  useEffect(() => {
    if (!enabled) return;
    const maybeSync = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastAttemptRef.current < 10_000) return;
      void doSync();
    };
    const onOnline = () => void doSync();
    document.addEventListener('visibilitychange', maybeSync);
    window.addEventListener('focus', maybeSync);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', maybeSync);
      window.removeEventListener('focus', maybeSync);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, doSync]);

  const connect = useCallback(
    async (rawToken: string): Promise<boolean> => {
      const token = rawToken.trim();
      if (!token) {
        setError('Paste the token first.');
        setStatus('error');
        return false;
      }
      setStatus('syncing');
      setError(null);
      try {
        const user = await validateToken(token);
        let gistId = await findExistingGist(token);
        if (!gistId) {
          gistId = await createGist(token, canonicalize(dataRef.current));
        }
        tokenRef.current = token;
        gistIdRef.current = gistId;
        localStorage.setItem(LS_TOKEN, token);
        localStorage.setItem(LS_GIST, gistId);
        localStorage.setItem(LS_LOGIN, user);
        setLogin(user);
        setStatus('idle');
        setEnabled(true); // triggers the startup sync effect
        return true;
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not connect.');
        return false;
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    tokenRef.current = null;
    gistIdRef.current = null;
    lastSyncedCanonRef.current = null;
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_GIST);
    localStorage.removeItem(LS_LOGIN);
    localStorage.removeItem(LS_LAST);
    setEnabled(false);
    setLogin(null);
    setLastSyncAt(null);
    setStatus('idle');
    setError(null);
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({
      enabled,
      login,
      status,
      lastSyncAt,
      error,
      connect,
      disconnect,
      syncNow: () => void doSync()
    }),
    [enabled, login, status, lastSyncAt, error, connect, disconnect, doSync]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
