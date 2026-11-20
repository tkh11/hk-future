import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicPath } from '@/lib/public-path';
import { logout } from '../auth-actions';
import type { Access } from '../routes';
import CommandMenu from './CommandMenu';
import { LogoutIcon, UserIcon } from './icons';
import Nav from './Nav';
import SidebarToggle from './SidebarToggle';
import css from './Shell.module.css';

type Props = { user: { email: string; name?: string | null }; can: Record<Access, boolean>; children: ReactNode };

const sidebarScript = `(function(){try{if(localStorage.getItem('studio-sidebar:v1')==='1')document.documentElement.dataset.studioSidebar='collapsed'}catch(e){}})()`;

export default function Shell({ user, can, children }: Props) {
  const label = user.name || user.email;
  return (
    <div className={css.shell}>
      <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      <a href="#main" className={css.skip}>К содержимому</a>
      <aside className={css.sidebar}>
        <div className={css.brandBlock}>
          <Link href="/studio" className={css.brand} aria-label="HEISSKRAFT">
            <span className={css.logos}>
              <Image className={css.brandFull} src={publicPath('/brand/whitefull.svg')} alt="HEISSKRAFT" width={311} height={31} unoptimized priority />
              <Image className={css.brandMark} src={publicPath('/brand/whiteICON.svg')} alt="" width={98} height={36} unoptimized />
            </span>
          </Link>
          <SidebarToggle />
        </div>
        {can.edit ? <CommandMenu /> : null}
        <Nav can={can} />
        <div className={css.footer}>
          <Link href="/studio/profile" className={css.user} title={label}>
            <UserIcon className={css.icon} />
            <span data-sidebar-text>{label}</span>
          </Link>
          <form action={logout}>
            <button type="submit" className={css.logout} title="Выйти">
              <LogoutIcon className={css.icon} />
              <span data-sidebar-text>Выйти</span>
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className={css.main} tabIndex={-1}>{children}</main>
    </div>
  );
}
