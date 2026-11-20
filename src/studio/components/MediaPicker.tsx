'use client';

import { Dialog } from 'radix-ui';
import { useState, useTransition } from 'react';
import { PagerControls } from './ListPager';
import { pageRange } from '../pagination';
import { uploadMedia } from '../media-actions';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

export type MediaChoice = { id: number; url: string; alt: string };

export default function MediaPicker({ open, onOpenChange, options, onPick, title = 'Выбрать файл', accept = 'image/jpeg,image/png,image/webp,application/pdf,video/mp4', description = 'Первое фото в карточке станет главным. Замена файла создаёт новую запись: исходный файл не перезаписывается.' }: {
  open: boolean; onOpenChange: (open: boolean) => void; options: MediaChoice[]; onPick: (file: MediaChoice) => void; title?: string;
  accept?: string; description?: string;
}) {
  const [query, setQuery] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 20 });
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<(MediaChoice & { mime: string })[]>([]);
  const choices = new Map(options.map(item => [item.id, item]));
  for (const item of local) if (accept.split(',').includes(item.mime)) choices.set(item.id, item);
  const shown = [...choices.values()].filter(item => !query || `${item.alt} ${item.url}`.toLowerCase().includes(query.toLowerCase()));

  const paging = pageRange(shown.length, params);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} style={{ width: 'min(720px, calc(100vw - 32px))' }}>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className={f.hint}>{description}</Dialog.Description>
          <input className={f.input} value={query} onChange={e => { setQuery(e.target.value); setParams(previous => ({ ...previous, page: 1 })); }} placeholder="Название или файл" aria-label="Поиск в медиатеке" />
          <label className={f.label}>
            Загрузить новый
            <input type="file" accept={accept} disabled={pending}
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (!accept.split(',').includes(file.type)) return setNotice('Выберите файл подходящего формата.');
                const form = new FormData();
                form.set('file', file);
                form.set('alt', file.name.replace(/\.[^.]+$/, ''));
                start(async () => {
                  const result = await uploadMedia(form);
                  if ('error' in result) return setNotice(result.error);
                  const choice = { id: result.id, url: result.url, alt: result.alt, mime: file.type };
                  setLocal(list => [choice, ...list]);
                  onPick(choice);
                  onOpenChange(false);
                });
              }} />
          </label>
          {notice ? <p className={f.error} role="alert">{notice}</p> : null}
          <div className={css.picker}>
            {shown.slice(paging.offset, paging.offset + paging.limit).map(item => (
              <button key={item.id} type="button" onClick={() => { onPick(item); onOpenChange(false); }}>
                {item.url.match(/\.(pdf|mp4)(?:[?#]|$)/i) ? <span>{item.alt}</span> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" />
                )}
                <span>{item.alt}</span>
              </button>
            ))}
          </div>
          <PagerControls {...paging} onChange={(page, limit) => setParams({ page, limit })} />
          <div className={css.dialogActions}>
            <Dialog.Close className={ui.button}>Закрыть</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
