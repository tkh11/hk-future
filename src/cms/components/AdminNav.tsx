'use client';

import { Hamburger, Link, Logout, useAuth, useConfig, useNav } from '@payloadcms/ui';
import { usePathname } from 'next/navigation';
import type { CollectionSlug, GlobalSlug, VisibleEntities } from 'payload';
import type { User } from '@/cms/payload-types';
import { AdminLogo } from './AdminBrand';

type Item = { title: string; path: string; collection?: CollectionSlug; global?: GlobalSlug; adminOnly?: boolean };
const groups: { title: string; items: Item[] }[] = [
  { title: 'Каталог', items: [
    { title: 'Товары', path: '/collections/products', collection: 'products' },
    { title: 'Категории', path: '/collections/categories', collection: 'categories' },
    { title: 'Серии продукции', path: '/collections/product-series', collection: 'product-series' },
    { title: 'Импорт каталога', path: '#import', collection: 'import-batches' },
    { title: 'История импорта', path: '/collections/import-batches', collection: 'import-batches' },
  ] },
  { title: 'Страницы сайта', items: [
    { title: 'Все страницы', path: '/collections/pages', collection: 'pages' },
    { title: 'Тексты решений', path: '/globals/solution-content', global: 'solution-content' },
  ] },
  { title: 'Контакты и меню', items: [
    { title: 'Контакты', path: '/globals/contacts', global: 'contacts' },
    { title: 'Меню сайта', path: '/globals/navigation', global: 'navigation' },
  ] },
  { title: 'Настройки', items: [
    { title: 'Пользователи', path: '/collections/users', collection: 'users', adminOnly: true },
    { title: 'Перенаправления', path: '/collections/redirects', collection: 'redirects', adminOnly: true },
    { title: 'Настройки сайта', path: '/globals/site-settings', global: 'site-settings', adminOnly: true },
  ] },
];

/** Uses Payload's own nav state, route transitions and logout, including mobile. */
export default function AdminNav({ visibleEntities }: { visibleEntities?: VisibleEntities }) {
  const { user, permissions } = useAuth<User>();
  const { config } = useConfig();
  const pathname = usePathname();
  const { navOpen, navRef, hydrated, shouldAnimate, setNavOpen } = useNav();
  if (!user) return null;
  const adminPath = config.routes.admin;
  const mayEdit = ['admin', 'editor', 'publisher'].includes(user.role);
  const allowed = (item: Item) => {
    if (item.adminOnly && user.role !== 'admin') return false;
    if (!mayEdit && (item.collection || item.global)) return false;
    if (item.collection) return !!permissions?.collections?.[item.collection]?.read && (!visibleEntities || visibleEntities.collections.includes(item.collection));
    if (item.global) return !!permissions?.globals?.[item.global]?.read && (!visibleEntities || visibleEntities.globals.includes(item.global));
    return true;
  };
  const closeOnMobile = () => { if (window.matchMedia('(max-width: 768px)').matches) setNavOpen(false); };
  const renderLink = (item: Item) => {
    const href = `${adminPath}${item.path}`;
    const active = !item.path.includes('#') && (pathname === href || (item.path !== '' && pathname.startsWith(`${href}/`)));
    return <Link key={item.path} href={href} prefetch={false} className="hk-admin-nav-link" aria-current={active ? 'page' : undefined} onClick={closeOnMobile}>{item.title}</Link>;
  };
  const renderGroup = (title: string) => {
    const group = groups.find(item => item.title === title)!;
    const items = group.items.filter(allowed);
    if (!items.length) return null;
    return <section key={title} className="hk-admin-nav-group" aria-label={title}><h2>{title}</h2>{items.map(renderLink)}</section>;
  };
  return <aside className={['nav', 'hk-admin-nav', navOpen && 'nav--nav-open', hydrated && 'nav--nav-hydrated', shouldAnimate && 'nav--nav-animate'].filter(Boolean).join(' ')} inert={!navOpen ? true : undefined}>
    <div className="nav__scroll" ref={navRef}>
      <Link href={adminPath} prefetch={false} className="hk-admin-nav-brand" onClick={closeOnMobile}><AdminLogo /></Link>
      <nav className="nav__wrap" aria-label="Управление сайтом">
        {renderLink({ title: 'Главная', path: '' })}
        {renderGroup('Каталог')}
        {renderGroup('Страницы сайта')}
        {allowed({ title: '', path: '', collection: 'articles' }) && renderLink({ title: 'Новости и статьи', path: '/collections/articles' })}
        {allowed({ title: '', path: '', collection: 'media' }) && renderLink({ title: 'Файлы', path: '/collections/media' })}
        {renderGroup('Контакты и меню')}
        {renderLink({ title: 'Статистика', path: '#statistics' })}
        {renderGroup('Настройки')}
        <div className="hk-admin-nav-footer">
          <Link href={`${adminPath}${config.admin.routes.account}`} prefetch={false} onClick={closeOnMobile}>Мой профиль</Link>
          <Logout />
        </div>
      </nav>
    </div>
    <div className="nav__header"><div className="nav__header-content"><button className="nav__mobile-close" type="button" aria-label="Закрыть меню" onClick={() => setNavOpen(false)} tabIndex={navOpen ? 0 : -1}><Hamburger isActive /></button></div></div>
  </aside>;
}
