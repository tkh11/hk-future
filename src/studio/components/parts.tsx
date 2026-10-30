import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { publishLabels, reviewLabels, type PublishState, type ReviewState } from '../labels';
import { SortIcon } from './icons';
import ui from './ui.module.css';
import thumb from './Thumb.module.css';

export function PublishBadge({ status }: { status: PublishState }) {
  return <span className={`${ui.badge} ${ui[status]}`}>{publishLabels[status]}</span>;
}

export function ReviewBadge({ review }: { review: ReviewState }) {
  if (review === 'ready') return <span className={ui.muted}>—</span>;
  return <span className={`${ui.badge} ${ui[review]}`}>{reviewLabels[review]}</span>;
}

/** Local uploads go through the image optimiser, so a 3 MB original arrives as a few kilobytes. */
export function Thumb({ image }: { image: { url: string; alt: string } | null }) {
  if (!image) return <span className={thumb.missing} title="Нет главного фото" />;
  return <Image className={thumb.image} src={image.url} alt={image.alt} width={36} height={36} sizes="36px" unoptimized={!image.url.startsWith('/')} />;
}

export type SortState = { href: string; direction?: 'asc' | 'desc' };

export function SortLink({ label, state }: { label: string; state: SortState }) {
  return (
    <Link href={state.href} className={ui.sortButton} scroll={false}>
      {label}
      <SortIcon direction={state.direction} />
    </Link>
  );
}

export const ariaSort = (state: SortState) => (state.direction === 'asc' ? 'ascending' : state.direction === 'desc' ? 'descending' : undefined);

export function Pager({ from, to, total, page, pages, href, hint }: { from: number; to: number; total: number; page: number; pages: number; href: (page: number) => string; hint?: ReactNode }) {
  return (
    <div className={ui.pager}>
      <span className="num">{total ? `Строки ${from}–${to} из ${total}` : 'Нет строк'}</span>
      <span className={ui.spacer} />
      {hint ? <span className={ui.hint}>{hint}</span> : null}
      {pages > 1 ? (
        <nav aria-label="Страницы" className={ui.pagerLinks}>
          <Link href={href(page - 1)} className={`${ui.button} ${page <= 1 ? ui.disabledLink : ''}`} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>Назад</Link>
          <Link href={href(page + 1)} className={`${ui.button} ${page >= pages ? ui.disabledLink : ''}`} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined}>Дальше</Link>
        </nav>
      ) : null}
    </div>
  );
}
