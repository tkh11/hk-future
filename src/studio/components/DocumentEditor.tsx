'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { reviewLabels, type ReviewState } from '../labels';
import { saveRecord } from '../record-actions';
import MediaPicker, { type MediaChoice } from './MediaPicker';
import { Field } from './editor/parts';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

export type DocumentValues = { title: string; kind: string; description: string; file: number | null; cover: number | null; reviewState: ReviewState; reviewNotes: string };

export default function DocumentEditor({ id, initial, files, canPublish }: { id: number; initial: DocumentValues; files: MediaChoice[]; canPublish: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<'file' | 'cover' | null>(null);
  const [pending, start] = useTransition();
  const update = (patch: Partial<DocumentValues>) => setV(current => ({ ...current, ...patch }));
  const save = (publish = false) => start(async () => {
    const result = await saveRecord('catalog-documents', id, { ...v, file: v.file ?? undefined, cover: v.cover ?? undefined }, publish ? 'publish' : 'save');
    setNotice('error' in result ? result.error : publish ? 'Опубликовано.' : 'Сохранено.');
    router.refresh();
  });
  const named = (fid: number | null) => files.find(f => f.id === fid)?.alt ?? (fid ? `Файл ${fid}` : 'Не выбран');

  return (
    <form className={`${f.form} ${f.section}`} style={{ maxWidth: 720 }} onSubmit={e => { e.preventDefault(); save(); }}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      <Field path="title" label="Название">{props => <input {...props} className={f.input} value={v.title} onChange={e => update({ title: e.target.value })} />}</Field>
      <Field path="kind" label="Вид документа">{props => <input {...props} className={f.input} value={v.kind} onChange={e => update({ kind: e.target.value })} />}</Field>
      <Field path="description" label="Описание">{props => <textarea {...props} className={f.textarea} rows={4} value={v.description} onChange={e => update({ description: e.target.value })} />}</Field>
      <div className={css.row}>
        <div className={f.field}>
          <span className={f.label}>PDF-файл</span>
          <button type="button" className={ui.button} onClick={() => setOpen('file')}>{named(v.file)}</button>
        </div>
        <div className={f.field}>
          <span className={f.label}>Обложка</span>
          <button type="button" className={ui.button} onClick={() => setOpen('cover')}>{named(v.cover)}</button>
        </div>
      </div>
      <div className={f.segmented} role="radiogroup" aria-label="Проверка">
        {(['ready', 'review', 'blocked'] as ReviewState[]).map(state => (
          <label key={state}><input type="radio" name="review" checked={v.reviewState === state} onChange={() => update({ reviewState: state })} /><span>{reviewLabels[state]}</span></label>
        ))}
      </div>
      <Field path="reviewNotes" label="Что нужно проверить">{props => <textarea {...props} className={f.textarea} rows={3} value={v.reviewNotes} onChange={e => update({ reviewNotes: e.target.value })} />}</Field>
      <div className={f.actions}>
        <button type="submit" className={ui.button} disabled={pending}>Сохранить</button>
        {canPublish ? <button type="button" className={`${ui.button} ${ui.primary}`} disabled={pending} onClick={() => save(true)}>Опубликовать</button> : null}
      </div>
      <MediaPicker open={open !== null} onOpenChange={next => { if (!next) setOpen(null); }} options={files} onPick={file => { if (open) update({ [open]: file.id }); }} title="Из библиотеки" />
    </form>
  );
}
