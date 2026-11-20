'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveGlobal } from '../record-actions';
import f from './form.module.css';
import ui from './ui.module.css';

type Item = { label: string; href: string; id?: string | null };

export default function NavEditor({ items }: { items: Item[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className={`${f.form} ${f.section}`} style={{ maxWidth: 720 }} onSubmit={e => {
      e.preventDefault();
      start(async () => {
        const result = await saveGlobal('navigation', { items: rows });
        setNotice('error' in result ? result.error : 'Сохранено.');
        router.refresh();
      });
    }}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      {rows.map((row, index) => (
        <div className={f.grid} key={row.id ?? index}>
          <input className={f.input} value={row.label} aria-label="Название пункта" onChange={e => setRows(list => list.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))} />
          <input className={`${f.input} ${f.mono}`} value={row.href} aria-label="Ссылка" onChange={e => setRows(list => list.map((item, i) => (i === index ? { ...item, href: e.target.value } : item)))} />
          <button type="button" className={ui.button} onClick={() => setRows(list => list.filter((_, i) => i !== index))}>Удалить</button>
        </div>
      ))}
      <button type="button" className={ui.button} onClick={() => setRows(list => [...list, { label: '', href: '/' }])}>Добавить пункт</button>
      <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Сохраняю…' : 'Сохранить меню'}</button>
    </form>
  );
}
