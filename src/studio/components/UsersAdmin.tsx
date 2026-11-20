'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { roleLabels } from '../labels';
import { createUser, saveUser } from '../record-actions';
import f from './form.module.css';
import ui from './ui.module.css';

type UserRow = { id: number; email: string; name: string | null; role: keyof typeof roleLabels };

export default function UsersAdmin({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className={f.form}>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <caption className="visually-hidden">Пользователи</caption>
          <thead><tr><th>Почта</th><th>Имя</th><th>Роль</th><th>Новый пароль</th></tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <input className={f.input} defaultValue={user.name ?? ''} aria-label={`Имя ${user.email}`}
                    onBlur={e => e.target.value !== (user.name ?? '') && start(async () => { const r = await saveUser(user.id, { name: e.target.value }); setNotice('error' in r ? r.error : 'Сохранено.'); router.refresh(); })} />
                </td>
                <td>
                  <select className={f.select} defaultValue={user.role} aria-label={`Роль ${user.email}`}
                    onChange={e => start(async () => { const r = await saveUser(user.id, { role: e.target.value as UserRow['role'] }); setNotice('error' in r ? r.error : 'Роль обновлена.'); router.refresh(); })}>
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
                <td>
                  <input className={f.input} type="password" minLength={10} placeholder="Не короче 10" aria-label={`Пароль ${user.email}`}
                    onBlur={e => { if (e.target.value.length >= 10) start(async () => { const r = await saveUser(user.id, { password: e.target.value }); setNotice('error' in r ? r.error : 'Пароль обновлён.'); e.target.value = ''; }); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className={f.section} onSubmit={e => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const r = await createUser({
            email: String(form.get('email') ?? ''), name: String(form.get('name') ?? ''),
            role: String(form.get('role') ?? 'editor') as UserRow['role'], password: String(form.get('password') ?? ''),
          });
          setNotice('error' in r ? r.error : 'Пользователь создан.');
          if (!('error' in r)) { (e.target as HTMLFormElement).reset(); router.refresh(); }
        });
      }}>
        <h2>Новый пользователь</h2>
        <p className={f.hint}>Почта отключена: пароль задаёте вы.</p>
        <input className={f.input} name="email" type="email" required placeholder="email@heisskraft.local" />
        <input className={f.input} name="name" placeholder="Имя" />
        <select className={f.select} name="role" defaultValue="editor">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input className={f.input} name="password" type="password" required minLength={10} placeholder="Пароль, не короче 10" />
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>Создать</button>
      </form>
    </div>
  );
}
