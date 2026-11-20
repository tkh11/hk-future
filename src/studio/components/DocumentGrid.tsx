'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { reorderDocument } from '../document-actions';
import type { PublishState, ReviewState } from '../labels';
import { PublishBadge, ReviewBadge } from './parts';
import grid from './Library.module.css';
import ui from './ui.module.css';

export type DocumentCard = {
  id: string; title: string; kind: string; cover: string | null;
  status?: PublishState; review?: ReviewState;
};

export default function DocumentGrid({ cards, offset, total, version, canMove }: {
  cards: DocumentCard[]; offset: number; total: number; version: string; canMove: boolean;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState('');
  const [target, setTarget] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  function move(id: string, position: number) {
    if (!canMove || pending) return;
    start(async () => {
      try {
        const result = await reorderDocument(id, position, version);
        setNotice('error' in result ? result.error : 'Порядок сохранён.');
        router.refresh();
      } catch {
        setNotice('Не удалось сохранить порядок. Повторите перемещение.');
      }
    });
  }
  return <>
    {notice && <p role="status">{notice}</p>}
    {!cards.length && <p className={ui.muted}>Нет документов.</p>}
    <div className={grid.documents} aria-busy={pending}>
      {cards.map((doc, index) => {
        const position = offset + index + 1;
        return <article key={doc.id} className={grid.document} data-target={target === doc.id || undefined}
          draggable={canMove && !pending}
          onDragStart={event => {
            if (!canMove || pending || (event.target as HTMLElement).closest('form input, form button')) { event.preventDefault(); return; }
            event.dataTransfer.setData('text/plain', doc.id); event.dataTransfer.effectAllowed = 'move'; setDragging(doc.id);
          }}
          onDragEnd={() => { setDragging(''); setTarget(''); }}
          onDragOver={event => {
            if (dragging && dragging !== doc.id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setTarget(doc.id); }
          }}
          onDrop={event => {
            event.preventDefault();
            if (dragging && dragging !== doc.id) move(dragging, position);
            setDragging(''); setTarget('');
          }}>
          <Link href={`/studio/assortment/documents/${doc.id}`} prefetch={false} draggable={false}>
            <span className={grid.cover}>{doc.cover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={doc.cover} loading="lazy" draggable={false} alt="" />
              : <span>PDF</span>}</span>
            <strong>{doc.title}</strong>
          </Link>
          <span className={ui.muted}>{doc.kind}</span>
          {doc.status && <PublishBadge status={doc.status} />}
          {doc.review && doc.review !== 'ready' && <ReviewBadge review={doc.review} />}
          {canMove && <form className={grid.position} onSubmit={event => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem('position') as HTMLInputElement;
            if (input.valueAsNumber !== position) move(doc.id, input.valueAsNumber);
          }}>
            <span className={grid.grip} title="Перетащить документ">⠿</span>
            <input key={position} name="position" type="number" min="1" max={total} required defaultValue={position} disabled={pending} aria-label={`Позиция: ${doc.title}`} />
            <button type="submit" className={ui.button} disabled={pending} aria-label={`Переместить: ${doc.title}`}>ОК</button>
          </form>}
        </article>;
      })}
    </div>
  </>;
}
