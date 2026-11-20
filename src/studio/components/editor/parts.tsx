'use client';

import { AlertDialog } from 'radix-ui';
import { useEffect, useState, type ReactNode } from 'react';
import f from '../form.module.css';
import ui from '../ui.module.css';
import type { DraftStatus } from './useDraft';
import css from './Editor.module.css';

const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'Europe/Moscow' });
const today = (iso: string) => day.format(new Date(iso)) === day.format(new Date());
export const savedLabel = (iso: string) => (today(iso) ? time.format(new Date(iso)) : `${day.format(new Date(iso))}, ${time.format(new Date(iso))}`);

export const fieldId = (path: string) => `f-${path}`;

/** Moves to the field and focuses its control; sections without a control get the heading. */
export function focusField(path: string) {
  const node = document.getElementById(fieldId(path))
    ?? document.getElementById(fieldId(path.split('.')[0]))
    ?? document.getElementById(`s-${path}`);
  node?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  node?.focus({ preventScroll: true });
}

export function SaveStatus({ status }: { status: DraftStatus }) {
  const text = status.kind === 'saving' ? 'Сохраняется…'
    : status.kind === 'dirty' ? 'Есть несохранённые правки'
    : status.kind === 'error' ? 'Не сохранено'
    : status.savedAt ? `Сохранено · ${savedLabel(status.savedAt)}` : 'Новая запись';
  // «Today» is judged by each clock; around midnight the server and browser may disagree.
  return <span className={css.save} data-kind={status.kind} role="status" aria-live="polite" suppressHydrationWarning>{text}</span>;
}

/** The first field error is a link: the form may be long and the field off screen. */
export function SaveError({ status, labels }: { status: DraftStatus; labels: Record<string, string> }) {
  if (status.kind !== 'error') return null;
  return (
    <div className={css.banner} data-tone="error" role="alert">
      <span>{status.message}</span>
      {status.fields.length ? (
        <ul>{status.fields.map(field => (
          <li key={field.path}><button type="button" className={css.link} onClick={() => focusField(field.path)}>{labels[field.path.split('.')[0]] ?? field.path}</button></li>
        ))}</ul>
      ) : null}
    </div>
  );
}

type FieldProps = { path: string; label: string; hint?: ReactNode; aside?: ReactNode; error?: string; children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode };

export function Field({ path, label, hint, aside, error, children }: FieldProps) {
  const id = fieldId(path);
  const note = error || hint ? `${id}-note` : undefined;
  return (
    <div className={f.field}>
      <label htmlFor={id} className={f.label}><span>{label}</span>{aside ? <span className={f.hint}>{aside}</span> : null}</label>
      {children({ id, ...(error ? { 'aria-invalid': true } : {}), ...(note ? { 'aria-describedby': note } : {}) })}
      {error ? <p id={note} className={f.error}>{error}</p> : hint ? <p id={note} className={f.hint}>{hint}</p> : null}
    </div>
  );
}

export type TocEntry = { id: string; title: string; meta?: string; attention?: boolean };

/** Highlights the section nearest the top of the viewport. */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id);
  const ids = entries.map(e => e.id).join(' ');
  useEffect(() => {
    const nodes = ids.split(' ').flatMap(id => document.getElementById(id) ?? []);
    const observer = new IntersectionObserver(items => {
      const visible = items.filter(i => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-96px 0px -60% 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [ids]);
  return (
    <nav className={css.toc} aria-label="Разделы карточки">
      {entries.map(entry => (
        <a key={entry.id} href={`#${entry.id}`} aria-current={active === entry.id ? 'true' : undefined}>
          {entry.title}
          {entry.meta ? <span className={css.meta} data-attention={entry.attention || undefined}>{entry.meta}</span> : null}
        </a>
      ))}
    </nav>
  );
}

type ConfirmProps = { trigger: ReactNode; title: string; text: string; confirm: string; onConfirm: () => void; disabled?: boolean; className?: string };

export function Confirm({ trigger, title, text, confirm, onConfirm, disabled, className }: ConfirmProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className={className ?? ui.button} disabled={disabled}>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={css.overlay} />
        <AlertDialog.Content className={css.dialog}>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{text}</AlertDialog.Description>
          <div className={css.dialogActions}>
            <AlertDialog.Cancel className={`${ui.button} ${ui.ghost}`}>Отмена</AlertDialog.Cancel>
            <AlertDialog.Action className={`${ui.button} ${ui.primary}`} onClick={onConfirm}>{confirm}</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
