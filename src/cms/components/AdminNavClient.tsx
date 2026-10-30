'use client';

import type { ComponentType } from 'react';
import { DocumentIcon, FolderIcon, GearIcon, GridViewIcon, Hamburger, Link, ListViewIcon, Logout, useAuth, useConfig, useNav } from '@payloadcms/ui';
import { usePathname } from 'next/navigation';
import type { CollectionSlug, GlobalSlug, VisibleEntities } from 'payload';
import type { User } from '@/cms/payload-types';
import { AdminLogo } from './AdminBrand';
import AdminCommandMenu, { type Destination } from './AdminCommandMenu';

type Item = { title: string; path: string; collection?: CollectionSlug; global?: GlobalSlug; adminOnly?: boolean; also?: string[]; needsSeries?: boolean };
type Section = { title: string; Icon: ComponentType; path?: string; collection?: CollectionSlug; items?: Item[] };
const sections: Section[] = [
  { title: 'Обзор', Icon: GridViewIcon, path: '' },
  { title: 'Ассортимент', Icon: ListViewIcon, items: [
    { title: 'Товары', path: '/collections/products', collection: 'products' },
    { title: 'Варианты', path: '/collections/product-variants', collection: 'product-variants' },
    { title: 'Категории', path: '/collections/categories', collection: 'categories' },
    { title: 'Серии', path: '/collections/product-series', collection: 'product-series', needsSeries: true },
    { title: 'Документы', path: '/collections/catalog-documents', collection: 'catalog-documents' },
    { title: 'Импорт', path: '/import', collection: 'import-batches', also: ['/collections/import-batches'] },
  ] },
  { title: 'Медиа', Icon: FolderIcon, path: '/collections/media', collection: 'media' },
  { title: 'Сайт', Icon: DocumentIcon, items: [
    { title: 'Страницы', path: '/collections/pages', collection: 'pages' },
    { title: 'Тексты решений', path: '/globals/solution-content', global: 'solution-content' },
    { title: 'Новости и статьи', path: '/collections/articles', collection: 'articles' },
    { title: 'Контакты', path: '/globals/contacts', global: 'contacts' },
    { title: 'Меню сайта', path: '/globals/navigation', global: 'navigation' },
  ] },
  { title: 'Настройки', Icon: GearIcon, items: [
    { title: 'Пользователи', path: '/collections/users', collection: 'users', adminOnly: true },
    { title: 'Перенаправления', path: '/collections/redirects', collection: 'redirects', adminOnly: true },
    { title: 'Настройки сайта', path: '/globals/site-settings', global: 'site-settings', adminOnly: true },
  ] },
];

/** Uses Payload's own nav state, route transitions and logout, including mobile. */
export default function AdminNavClient({ visibleEntities, hasSeries }: { visibleEntities?: VisibleEntities; hasSeries: boolean }) {
  const { user, permissions } = useAuth<User>();
  const { config } = useConfig();
  const pathname = usePathname();
  const { navOpen, navRef, hydrated, shouldAnimate, setNavOpen } = useNav();
  if (!user) return null;
  const adminPath = config.routes.admin;
  const mayEdit = ['admin', 'editor', 'publisher'].includes(user.role);
  const allowed = (item: Item | Section) => {
    if ('adminOnly' in item && item.adminOnly && user.role !== 'admin') return false;
    if ('needsSeries' in item && item.needsSeries && !hasSeries) return false;
    const global = 'global' in item ? item.global : undefined;
    if (!mayEdit && (item.collection || global)) return false;
    if (item.collection) return !!permissions?.collections?.[item.collection]?.read && (!visibleEntities || visibleEntities.collections.includes(item.collection));
    if (global) return !!permissions?.globals?.[global]?.read && (!visibleEntities || visibleEntities.globals.includes(global));
    return true;
  };
  const isActive = (path: string, also: string[] = []) => {
    if (path === '') return pathname === adminPath || pathname === `${adminPath}/`;
    return [path, ...also].some(candidate => pathname === `${adminPath}${candidate}` || pathname.startsWith(`${adminPath}${candidate}/`));
  };
  const closeOnMobile = () => { if (window.matchMedia('(max-width: 768px)').matches) setNavOpen(false); };
  const visible = sections.flatMap(section => {
    if (section.items) {
      const items = section.items.filter(allowed);
      return items.length ? [{ ...section, items }] : [];
    }
    return allowed(section) ? [section] : [];
  });
  const destinations: Destination[] = visible.flatMap(section => section.items
    ? section.items.map(item => ({ title: item.title, section: section.title, href: `${adminPath}${item.path}` }))
    : [{ title: section.title, section: 'Разделы', href: `${adminPath}${section.path}` }]);
  return <aside className={['nav', 'hk-admin-nav', navOpen && 'nav--nav-open', hydrated && 'nav--nav-hydrated', shouldAnimate && 'nav--nav-animate'].filter(Boolean).join(' ')} inert={!navOpen ? true : undefined}>
    <div className="nav__scroll" ref={navRef}>
      <Link href={adminPath} prefetch={false} className="hk-admin-nav-brand" onClick={closeOnMobile}><AdminLogo /></Link>
      <AdminCommandMenu destinations={destinations} searchCatalog={mayEdit && !!permissions?.collections?.products?.read} onNavigate={closeOnMobile} />
      <nav className="nav__wrap" aria-label="Управление сайтом">
        {visible.map(({ title, Icon, path, items }) => items
          ? <section key={title} className="hk-admin-nav-group" aria-labelledby={`hk-nav-${title}`}>
              <h2 id={`hk-nav-${title}`}><Icon />{title}</h2>
              {items.map(item => <Link key={item.path} href={`${adminPath}${item.path}`} prefetch={false} className="hk-admin-nav-link" aria-current={isActive(item.path, item.also) ? 'page' : undefined} onClick={closeOnMobile}>{item.title}</Link>)}
            </section>
          : <Link key={title} href={`${adminPath}${path}`} prefetch={false} className="hk-admin-nav-link hk-admin-nav-link--top" aria-current={isActive(path!) ? 'page' : undefined} onClick={closeOnMobile}><Icon />{title}</Link>)}
        <div className="hk-admin-nav-footer">
          <Link href={`${adminPath}${config.admin.routes.account}`} prefetch={false} onClick={closeOnMobile}>Мой профиль</Link>
          <Logout />
        </div>
      </nav>
    </div>
    <div className="nav__header"><div className="nav__header-content"><button className="nav__mobile-close" type="button" aria-label="Закрыть меню" onClick={() => setNavOpen(false)} tabIndex={navOpen ? 0 : -1}><Hamburger isActive /></button></div></div>
  </aside>;
}
