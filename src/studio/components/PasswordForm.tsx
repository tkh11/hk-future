'use client';

import { useActionState } from 'react';
import { changePassword } from '../auth-actions';
import form from './form.module.css';
import ui from './ui.module.css';

export default function PasswordForm({ changed }: { changed: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const message = state?.error ?? (changed ? 'Пароль изменён. На других устройствах нужно войти заново.' : '');
  return (
    <form action={action} className={form.section} noValidate>
      <h2>Пароль</h2>
      <label className={form.field}>
        <span className={form.label}>Текущий пароль</span>
        <input className={form.input} type="password" name="current" autoComplete="current-password" required />
      </label>
      <div className={form.grid}>
        <label className={form.field}>
          <span className={form.label}>Новый пароль <span className={form.hint}>от 10 символов</span></span>
          <input className={form.input} type="password" name="next" autoComplete="new-password" minLength={10} required />
        </label>
        <label className={form.field}>
          <span className={form.label}>Повторите</span>
          <input className={form.input} type="password" name="repeat" autoComplete="new-password" required />
        </label>
      </div>
      <p role="status" className={state?.error ? form.error : form.ok}>{message}</p>
      <div className={form.actions}>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Сохраняю…' : 'Сменить пароль'}</button>
      </div>
    </form>
  );
}
