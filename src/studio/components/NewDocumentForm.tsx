'use client';

import { useState, useTransition } from 'react';
import { createDocument } from '../record-actions';
import f from './form.module.css';
import ui from './ui.module.css';

export default function NewDocumentForm() {
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className={`${f.form} ${f.section}`} style={{ maxWidth: 520 }} onSubmit={e => {
      e.preventDefault();
      start(async () => {
        const result = await createDocument({ title: title.trim() || 'Новый документ', reviewState: 'ready' });
        if (result && 'error' in result) setNotice(result.error);
      });
    }}>
      {notice ? <p className={f.alert} role="alert">{notice}</p> : null}
      <label className={f.field}>
        <span className={f.label}>Название</span>
        <input className={f.input} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} />
      </label>
      <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Создаю…' : 'Создать черновик'}</button>
    </form>
  );
}
