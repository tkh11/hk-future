'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveGlobal } from '../record-actions';
import f from './form.module.css';
import ui from './ui.module.css';

type Field = { path: string; label: string; multiline?: boolean };

export default function GlobalForm({ slug, fields, values }: { slug: 'contacts'; fields: Field[]; values: Record<string, string> }) {
  const router = useRouter();
  const [data, setData] = useState(values);
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className={`${f.form} ${f.section}`} style={{ maxWidth: 720 }} onSubmit={e => {
      e.preventDefault();
      start(async () => {
        const payload = { content: data };
        const result = await saveGlobal(slug, payload);
        setNotice('error' in result ? result.error : 'Сохранено.');
        router.refresh();
      });
    }}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      {fields.map(field => (
        <label key={field.path} className={f.field}>
          <span className={f.label}>{field.label}</span>
          {field.multiline
            ? <textarea className={f.textarea} rows={6} value={data[field.path] ?? ''} onChange={e => setData(d => ({ ...d, [field.path]: e.target.value }))} />
            : <input className={f.input} value={data[field.path] ?? ''} onChange={e => setData(d => ({ ...d, [field.path]: e.target.value }))} />}
        </label>
      ))}
      <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Сохраняю…' : 'Сохранить'}</button>
    </form>
  );
}
