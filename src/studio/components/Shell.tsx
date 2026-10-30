import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicPath } from '@/lib/public-path';
import { classic } from '../routes';
import CommandMenu from './CommandMenu';
import Nav from './Nav';
import css from './Shell.module.css';

export default function Shell({ user, admin, children }: { user: { email: string; name?: string | null }; admin: boolean; children: ReactNode }) {
  return (
    <div className={css.shell}>
      <a href="#main" className={css.skip}>К содержимому</a>
      <aside className={css.sidebar}>
        <Link href="/studio" className={css.brand}>
          <Image src={publicPath('/brand/whitefull.svg')} alt="HEISSKRAFT" width={311} height={31} unoptimized priority />
          <span>Каталог</span>
        </Link>
        <CommandMenu />
        <Nav admin={admin} />
        <div className={css.footer}>
          <span className={css.user} title={user.email}>{user.name || user.email}</span>
          <a href={classic()}>Классическая админка</a>
          <a href={classic('/logout')}>Выйти</a>
        </div>
      </aside>
      <main id="main" className={css.main} tabIndex={-1}>{children}</main>
    </div>
  );
}
