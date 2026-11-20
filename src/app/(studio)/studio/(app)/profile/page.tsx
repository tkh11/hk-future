import type { Metadata } from 'next';
import PasswordForm from '@/studio/components/PasswordForm';
import form from '@/studio/components/form.module.css';
import ui from '@/studio/components/ui.module.css';
import { roleLabels } from '@/studio/labels';
import { requireStaff } from '@/studio/session';

export const metadata: Metadata = { title: 'Мой профиль' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ user }, params] = await Promise.all([requireStaff(), searchParams]);
  return (
    <div style={{ maxWidth: 640 }}>
      <header className={ui.header}><h1>Мой профиль</h1></header>
      <div className={form.form}>
        <section className={form.section}>
          <h2>Учётная запись</h2>
          <div className={form.grid}>
            <div className={form.field}><span className={form.label}>Имя</span><span>{user.name || '—'}</span></div>
            <div className={form.field}><span className={form.label}>Почта</span><span>{user.email}</span></div>
            <div className={form.field}><span className={form.label}>Роль</span><span>{roleLabels[user.role as keyof typeof roleLabels] ?? user.role}</span></div>
          </div>
          <p className={form.hint}>Имя, почту и роль меняет администратор.</p>
        </section>
        <PasswordForm changed={params.password === 'changed'} />
      </div>
    </div>
  );
}
