'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { classic } from '../routes';
import { BoxIcon, ExternalIcon, GearIcon, GlobeIcon, ImageIcon, OverviewIcon } from './icons';
import css from './Shell.module.css';

type Item = { title: string; href: string; external?: boolean };
type Section = Item & { Icon: ComponentType<SVGProps<SVGSVGElement>>; items?: Item[]; adminOnly?: boolean };

const sections: Section[] = [
  { title: 'Обзор', href: '/studio', Icon: OverviewIcon },
  {
    title: 'Ассортимент', href: '', Icon: BoxIcon, items: [
      { title: 'Товары', href: '/studio/assortment' },
      { title: 'Варианты', href: '/studio/assortment/variants' },
      { title: 'Категории', href: classic('/collections/categories'), external: true },
      { title: 'Документы', href: classic('/collections/catalog-documents'), external: true },
      { title: 'Импорт', href: classic('/import'), external: true },
    ],
  },
  { title: 'Медиа', href: classic('/collections/media'), Icon: ImageIcon, external: true },
  { title: 'Сайт', href: classic('/collections/pages'), Icon: GlobeIcon, external: true },
  { title: 'Настройки', href: classic('/collections/users'), Icon: GearIcon, external: true, adminOnly: true },
];

function ItemLink({ item, current, children, className }: { item: Item; current: boolean; children: ReactNode; className: string }) {
  if (item.external) {
    return (
      <a href={item.href} className={className} title="Откроется в классической админке">
        {children}
        <ExternalIcon className={css.external} />
      </a>
    );
  }
  return <Link href={item.href} className={className} aria-current={current ? 'page' : undefined}>{children}</Link>;
}

export default function Nav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Разделы" className={css.nav}>
      {sections.filter(s => admin || !s.adminOnly).map(section => (
        <div key={section.title} className={css.section}>
          {section.items ? (
            <p className={css.sectionLabel}>
              <section.Icon className={css.icon} />
              <span>{section.title}</span>
            </p>
          ) : (
            <ItemLink item={section} current={pathname === section.href} className={css.sectionLink}>
              <section.Icon className={css.icon} />
              <span>{section.title}</span>
            </ItemLink>
          )}
          {section.items ? (
            <ul className={css.items}>
              {section.items.map(item => (
                <li key={item.title}>
                  <ItemLink item={item} current={pathname === item.href} className={css.itemLink}>
                    <span>{item.title}</span>
                  </ItemLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
