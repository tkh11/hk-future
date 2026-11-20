'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveRecord } from '../record-actions';
import { Field } from './editor/parts';
import f from './form.module.css';
import ui from './ui.module.css';

type Content = {
  category: string; description: string; lead: string; readingMinutes: number; date: string;
  catalogHref: string; selectionHref: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export default function ArticleEditor({ id, title, slug, content, canPublish }: { id: number; title: string; slug: string; content: Content; canPublish: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState({ title, slug, content });
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const c = values.content;
  const setContent = (patch: Partial<Content>) => setValues(v => ({ ...v, content: { ...v.content, ...patch } }));
  const save = (publish = false) => start(async () => {
    const result = await saveRecord('articles', id, { title: values.title, slug: values.slug, content: values.content }, publish ? 'publish' : 'save');
    setNotice('error' in result ? result.error : publish ? 'Опубликовано.' : 'Сохранено.');
    router.refresh();
  });

  return (
    <div className={f.form} style={{ maxWidth: 760 }}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      <Field path="title" label="Название">{props => <input {...props} className={f.input} value={values.title} onChange={e => setValues(v => ({ ...v, title: e.target.value }))} />}</Field>
      <Field path="slug" label="Адрес">{props => <input {...props} className={`${f.input} ${f.mono}`} value={values.slug} onChange={e => setValues(v => ({ ...v, slug: e.target.value }))} />}</Field>
      <Field path="category" label="Тема">{props => <input {...props} className={f.input} value={c.category} onChange={e => setContent({ category: e.target.value })} />}</Field>
      <Field path="lead" label="Вступление">{props => <textarea {...props} className={f.textarea} rows={4} value={c.lead} onChange={e => setContent({ lead: e.target.value })} />}</Field>
      <Field path="description" label="Описание для поиска">{props => <textarea {...props} className={f.textarea} rows={3} value={c.description} onChange={e => setContent({ description: e.target.value })} />}</Field>
      <div className={f.actions}>
        <button type="button" className={ui.button} disabled={pending} onClick={() => save()}>Сохранить</button>
        {canPublish ? <button type="button" className={`${ui.button} ${ui.primary}`} disabled={pending} onClick={() => save(true)}>Опубликовать</button> : null}
      </div>
    </div>
  );
}
