'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FieldError } from '../../errors';
import { changedFields } from '../../form-utils';
import { dropLock, renewLock } from '../../lock-actions';
import type { Lockable, LockHolder } from '../../locks';

export type SaveMode = 'autosave' | 'save';
export type SaveOutcome = { ok: true; savedAt: string } | { error: string; fields?: FieldError[]; locked?: boolean };
export type DraftStatus =
  | { kind: 'idle'; savedAt: string | null }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string; fields: FieldError[] };

const AUTOSAVE_MS = 1500;
const HEARTBEAT_MS = 60_000;

type Options<T> = {
  initial: T;
  updatedAt: string | null;
  save: (patch: Partial<T>, mode: SaveMode, previous: T) => Promise<SaveOutcome>;
  lock?: { collection: Lockable; id: number; holder: LockHolder | null };
};

/**
 * One draft per open editor: edits autosave after a pause, ⌘S saves at once,
 * saves never overlap, and a failed save keeps the edits for a retry.
 */
export function useDraft<T extends object>({ initial, updatedAt, save, lock }: Options<T>) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<DraftStatus>({ kind: 'idle', savedAt: updatedAt });
  const [holder, setHolder] = useState<LockHolder | null>(lock?.holder ?? null);
  const current = useRef(initial);
  const saved = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const running = useRef<Promise<void> | null>(null);
  const again = useRef<SaveMode | null>(null);
  const saveRef = useRef(save);

  const lockRef = useRef(lock);
  const flushRef = useRef<(mode: SaveMode) => Promise<boolean>>(async () => true);
  useLayoutEffect(() => {
    saveRef.current = save;
    lockRef.current = lock;
  });

  const flush = useCallback(async (mode: SaveMode): Promise<boolean> => {
    clearTimeout(timer.current);
    if (running.current) {
      // A queued request re-reads the latest values once the running save settles.
      again.current = again.current === 'save' ? 'save' : mode;
      await running.current;
      const next = again.current;
      again.current = null;
      return next ? flushRef.current(next) : true;
    }
    const snapshot = current.current;
    const patch = changedFields(saved.current, snapshot);
    if (!Object.keys(patch).length && mode === 'autosave') return true;
    let ok = false;
    running.current = (async () => {
      setStatus({ kind: 'saving' });
      const result = await saveRef.current(patch, mode, saved.current).catch((): SaveOutcome => ({ error: 'Нет связи с сервером. Изменения не потеряны — повторите сохранение.' }));
      if ('ok' in result) {
        saved.current = snapshot;
        ok = true;
        const dirty = Object.keys(changedFields(saved.current, current.current)).length > 0;
        setStatus(dirty ? { kind: 'dirty' } : { kind: 'idle', savedAt: result.savedAt });
        if (dirty) timer.current = setTimeout(() => void flushRef.current('autosave'), AUTOSAVE_MS);
      } else {
        setStatus({ kind: 'error', message: result.error, fields: result.fields ?? [] });
        const target = lockRef.current;
        if (result.locked && target) setHolder(await renewLock(target.collection, target.id).catch(() => null));
      }
    })();
    await running.current;
    running.current = null;
    return ok;
  }, []);
  useLayoutEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = useCallback((patch: Partial<T>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    setValues(next);
    setStatus(s => (s.kind === 'saving' || s.kind === 'error' ? s : { kind: 'dirty' }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush('autosave'), AUTOSAVE_MS);
  }, [flush]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flush('save');
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (Object.keys(changedFields(saved.current, current.current)).length) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [flush]);

  const lockCollection = lock?.collection;
  const lockId = lock?.id;
  const readOnly = holder !== null;
  useEffect(() => {
    if (!lockCollection || !lockId) return;
    let stopped = false;
    const renew = () => renewLock(lockCollection, lockId).then(h => { if (!stopped) setHolder(h); }, () => {});
    renew();
    const interval = setInterval(renew, HEARTBEAT_MS);
    const onHide = () => navigator.sendBeacon('/studio/lock', new Blob([JSON.stringify({ collection: lockCollection, id: lockId })], { type: 'application/json' }));
    window.addEventListener('pagehide', onHide);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('pagehide', onHide);
      void dropLock(lockCollection, lockId).catch(() => {});
    };
  }, [lockCollection, lockId]);

  const errorFor = (path: string) => (status.kind === 'error' ? status.fields.find(f => f.path === path)?.message : undefined);
  return { values, update, flush, status, holder, readOnly, errorFor };
}
