'use client';

import { useActionState } from 'react';
import { login } from '../auth-actions';
import form from './form.module.css';
import ui from './ui.module.css';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className={form.form} noValidate>
      <input type="hidden" name="next" value={next} />
      <label className={form.field}>
        <span className={form.label}>Почта</span>
        <input className={form.input} type="email" name="email" defaultValue={state?.email} autoComplete="username" required autoFocus={!state?.email} aria-invalid={state?.error ? true : undefined} />
      </label>
      <label className={form.field}>
        <span className={form.label}>Пароль</span>
        <input className={form.input} type="password" name="password" autoComplete="current-password" required autoFocus={!!state?.email} aria-invalid={state?.error ? true : undefined} />
      </label>
      <p role="alert" className={form.error}>{state?.error}</p>
      <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Вхожу…' : 'Войти'}</button>
    </form>
  );
}
