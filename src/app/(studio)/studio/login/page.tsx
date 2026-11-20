import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { publicPath } from '@/lib/public-path';
import LoginForm from '@/studio/components/LoginForm';
import { safeNext } from '@/studio/routes';
import { getStudioSession } from '@/studio/session';
import css from './login.module.css';

export const metadata: Metadata = { title: { absolute: 'Вход — Каталог HEISSKRAFT' } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  const { user } = await getStudioSession();
  if (user) redirect(next);
  return (
    <main className={css.page}>
      <div className={css.card}>
        <Image src={publicPath('/brand/whitefull.svg')} alt="HEISSKRAFT" width={311} height={31} unoptimized priority className={css.logo} />
        <h1 className={css.title}>Вход в каталог</h1>
        <LoginForm next={next} />
        <p className={css.note}>Забыли пароль? Новый пароль задаёт администратор.</p>
      </div>
    </main>
  );
}
