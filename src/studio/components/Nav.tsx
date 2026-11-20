'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type SVGProps } from 'react';
import type { Access } from '../routes';
import { pumpSelectionHref, pumpSelectionTitle } from '../routes';
import {
  ArticlesIcon, BoxIcon, CategoriesIcon, ContactsIcon, DocumentsIcon, GearIcon, GlobeIcon, ImageIcon,
  ImportIcon, MenuIcon, OverviewIcon, ProductsIcon, RedirectIcon, SlidersIcon, ChevronLeftIcon,
  UsersIcon, VariantsIcon,
} from './icons';
import css from './Shell.module.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Item = { title: string; href: string; Icon: Icon; need?: Access };
type Section = { title: string; href?: string; Icon: Icon; items?: Item[]; need?: Access };

const sections: Section[] = [
  { title: 'Обзор', href: '/studio', Icon: OverviewIcon },
  {
    title: 'Ассортимент', Icon: BoxIcon, need: 'edit', items: [
      { title: 'Товары', href: '/studio/assortment', Icon: ProductsIcon },
      { title: 'Номенклатура', href: '/studio/assortment/variants', Icon: VariantsIcon },
      { title: 'Категории', href: '/studio/assortment/categories', Icon: CategoriesIcon },
      { title: 'Документы', href: '/studio/assortment/documents', Icon: DocumentsIcon },
      { title: 'Импорт', href: '/studio/assortment/import', Icon: ImportIcon },
    ],
  },
  { title: 'Программы подбора', Icon: SlidersIcon, need: 'edit', items: [
    { title: pumpSelectionTitle, href: pumpSelectionHref, Icon: SlidersIcon },
  ] },
  { title: 'Медиа', href: '/studio/media', Icon: ImageIcon, need: 'edit' },
  {
    title: 'Сайт', Icon: GlobeIcon, need: 'edit', items: [
      { title: 'Статьи', href: '/studio/site/articles', Icon: ArticlesIcon },
      { title: 'Контакты', href: '/studio/site/contacts', Icon: ContactsIcon },
      { title: 'Меню', href: '/studio/site/navigation', Icon: MenuIcon },
    ],
  },
  {
    title: 'Настройки', Icon: GearIcon, need: 'admin', items: [
      { title: 'Пользователи', href: '/studio/settings/users', Icon: UsersIcon },
      { title: 'Редиректы', href: '/studio/settings/redirects', Icon: RedirectIcon },
    ],
  },
];

const allHrefs = sections.flatMap(s => [s.href, ...(s.items ?? []).map(i => i.href)]).filter((h): h is string => !!h);

/** The longest matching entry wins, so `/studio/assortment/12` highlights «Товары», not «Обзор». */
function currentHref(pathname: string) {
  return allHrefs.filter(h => pathname === h || (h !== '/studio' && pathname.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0];
}

export default function Nav({ can }: { can: Record<Access, boolean> }) {
  const current = currentHref(usePathname());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const allowed = (need?: Access) => !need || can[need];
  return (
    <nav id="studio-nav" aria-label="Разделы" className={css.nav}>
      {sections.filter(s => allowed(s.need)).map(section => {
        const fixed = section.title === 'Настройки';
        const open = fixed || (expanded[section.title] ?? (section.items?.some(item => item.href === current) || section.title === 'Ассортимент'));
        return (
        <div key={section.title} className={css.section}>
          {section.href ? (
            <Link href={section.href} className={css.sectionLink} title={section.title} data-wrap={section.href === pumpSelectionHref || undefined}
              aria-current={current === section.href ? 'page' : undefined}>
              <section.Icon className={css.icon} />
              <span data-sidebar-text>{section.title}</span>
            </Link>
          ) : !fixed ? (
            <button type="button" className={css.groupToggle} title={section.title} aria-label={section.title} aria-expanded={Boolean(open)}
              onClick={() => setExpanded(previous => ({ ...previous, [section.title]: !open }))}>
              <section.Icon className={css.icon} /><span data-sidebar-text>{section.title}</span><ChevronLeftIcon className={css.disclosure} />
            </button>
          ) : (
            <p className={css.sectionLabel}>
              <section.Icon className={css.icon} />
              <span data-sidebar-text>{section.title}</span>
            </p>
          )}
          {section.items && open ? (
            <ul className={css.items}>
              {section.items.filter(i => allowed(i.need)).map(item => (
                <li key={item.href}>
                  <Link href={item.href} className={css.itemLink} title={item.title} aria-current={current === item.href ? 'page' : undefined}>
                    <item.Icon className={css.icon} />
                    <span data-sidebar-text>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        );
      })}
    </nav>
  );
}
