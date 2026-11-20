'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteRedirect, saveRedirect } from '../record-actions';
import f from './form.module.css';
import ui from './ui.module.css';

export default function RedirectsAdmin({ rows }: { rows: { id: number; from: string; to: string }[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className={f.form}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <caption className="visually-hidden">Перенаправления</caption>
          <thead><tr><th>Откуда</th><th>Куда</th><th /></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="num">{row.from}</td>
                <td className="num">{row.to}</td>
                <td><button type="button" className={ui.button} disabled={pending} onClick={() => start(async () => { const r = await deleteRedirect(row.id); setNotice('error' in r ? r.error : 'Удалено.'); router.refresh(); })}>Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className={f.section} onSubmit={e => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveRedirect(null, { from: String(form.get('from') ?? ''), to: String(form.get('to') ?? '') });
          setNotice('error' in r ? r.error : 'Добавлено.');
          if (!('error' in r)) { (e.target as HTMLFormElement).reset(); router.refresh(); }
        });
      }}>
        <h2>Новое перенаправление</h2>
        <input className={`${f.input} ${f.mono}`} name="from" required placeholder="/old-path" />
        <input className={`${f.input} ${f.mono}`} name="to" required placeholder="/new-path" />
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>Добавить</button>
      </form>
    </div>
  );
}
