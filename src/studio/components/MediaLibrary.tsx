'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { generateMissingSizes, updateMediaMeta, uploadMedia } from '../media-actions';
import type { MediaCard, MediaKind } from '../media-data';
import grid from './Library.module.css';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

const filters: { value: '' | MediaKind; label: string }[] = [
  { value: '', label: 'Все' }, { value: 'photo', label: 'Фото' }, { value: 'drawing', label: 'Чертёж' },
  { value: 'document', label: 'Документ' }, { value: 'unused', label: 'Не используется' },
];

export default function MediaLibrary({ cards, limit, filter }: { cards: MediaCard[]; limit: number; filter: '' | MediaKind }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <>
      <div className={css.toolbar}>
        {filters.map(item => (
          <a key={item.value || 'all'} href={`/studio/media?limit=${limit}${item.value ? `&kind=${item.value}` : ''}`} className={ui.pill} aria-current={filter === item.value ? 'page' : undefined}>{item.label}</a>
        ))}
        <span className={ui.spacer} />
        <label className={ui.button}>
          Загрузить
          <input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" disabled={pending}
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const form = new FormData();
              form.set('file', file);
              form.set('alt', file.name.replace(/\.[^.]+$/, ''));
              start(async () => {
                try {
                  const result = await uploadMedia(form);
                  setNotice('error' in result ? result.error : `Загружено: ${result.alt}`);
                  router.refresh();
                } catch {
                  setNotice(`Не удалось загрузить ${file.name}. Попробуйте ещё раз.`);
                }
              });
            }} />
        </label>
        <button type="button" className={ui.button} disabled={pending} onClick={() => start(async () => {
          const result = await generateMissingSizes(40);
          setNotice(result.error ?? `Обработано изображений: ${result.ok}. Пропущено: ${result.skipped}.`);
          router.refresh();
        })}>
          Сгенерировать копии
        </button>
      </div>
      {notice ? <p className={f.notice} role="status">{notice}</p> : null}
      {cards.length ? (
        <div className={grid.media}>
          {cards.map(card => (
            <article key={card.id} className={css.tile}>
              {card.kind === 'document' ? <a className={grid.file} href={card.url} target="_blank" rel="noreferrer">PDF</a> : card.mime === 'video/mp4' ? <video controls preload="none" src={card.url} aria-label={card.title} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={card.url} target="_blank" rel="noreferrer" aria-label={card.title}><img loading="lazy" src={card.thumb || card.url} alt="" /></a>
              )}
              <div className={grid.caption}>
                {editing === card.id ? (
                  <input className={f.input} defaultValue={card.alt} aria-label="Альтернативный текст"
                    onBlur={e => start(async () => {
                      await updateMediaMeta(card.id, { alt: e.target.value });
                      setEditing(null);
                      router.refresh();
                    })} />
                ) : <button type="button" className={css.link} onClick={() => setEditing(card.id)}>{card.alt || card.title}</button>}
                <span className={ui.muted}>{card.used ? 'используется' : 'не используется'}{card.missingSizes ? ' · нет копий' : ''}</span>
              </div>
            </article>
          ))}
        </div>
      ) : <p className={ui.muted}>Нет файлов в этой выборке.</p>}
    </>
  );
}
