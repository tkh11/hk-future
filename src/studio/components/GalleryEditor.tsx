'use client';

import { useState } from 'react';
import MediaPicker, { type MediaChoice } from './MediaPicker';

type GalleryRow = { id?: string | null; file: number; role: 'main' | 'gallery' | 'technical'; caption: string };
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

const TEMPLATE = /^(img|image|dsc|dscn|photo|foto|скан|scan|\d+)[-_\s.]?/i;
const roleLabel = { main: 'Главное', gallery: 'Фото', technical: 'Чертёж' } as const;

export default function GalleryEditor({ value, files, readOnly, onChange }: {
  value: GalleryRow[]; files: MediaChoice[]; readOnly: boolean;
  onChange: (next: GalleryRow[]) => void;
}) {
  const [open, setOpen] = useState<'add' | number | null>(null);
  const lookup = new Map(files.map(f => [f.id, f]));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, i) => ({ ...item, role: i === 0 ? 'main' : item.role === 'main' ? 'gallery' : item.role })));
  };
  const pick = (choice: MediaChoice) => {
    if (open === 'add') onChange([...value, { file: choice.id, role: value.length ? 'gallery' : 'main', caption: '' }]);
    else if (typeof open === 'number') onChange(value.map((item, i) => (i === open ? { ...item, file: choice.id } : item)));
  };

  return (
    <>
      {value.length ? (
        <div className={css.gallery}>
          {value.map((item, index) => {
            const file = lookup.get(item.file);
            const alt = file?.alt ?? '';
            return (
              <figure key={`${item.file}-${index}`}>
                {file?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={alt} width={index ? 72 : 104} height={index ? 72 : 104} />
                ) : <span className={ui.muted}>Нет файла</span>}
                <figcaption>
                  {index === 0 ? 'Главное' : roleLabel[item.role]}
                  {TEMPLATE.test(alt) ? <span className={css.warn}> шаблонный alt</span> : null}
                </figcaption>
                {!readOnly ? (
                  <div className={css.toolbar}>
                    <button type="button" className={`${ui.button} ${css.small}`} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Левее">←</button>
                    <button type="button" className={`${ui.button} ${css.small}`} onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label="Правее">→</button>
                    <button type="button" className={`${ui.button} ${css.small}`} onClick={() => setOpen(index)}>Заменить файл</button>
                    <button type="button" className={`${ui.button} ${css.small}`} onClick={() => onChange(value.filter((_, i) => i !== index).map((row, i) => ({ ...row, role: i === 0 ? 'main' : row.role === 'main' ? 'gallery' : row.role })))}>Убрать</button>
                    <select className={f.select} value={item.role} aria-label="Назначение" onChange={e => onChange(value.map((row, i) => (i === index ? { ...row, role: e.target.value as typeof item.role } : row)))}>
                      <option value="main">Основное фото</option>
                      <option value="gallery">Фото</option>
                      <option value="technical">Чертёж</option>
                    </select>
                  </div>
                ) : null}
              </figure>
            );
          })}
        </div>
      ) : <p className={f.notice}>У карточки нет фото. Посетители увидят заглушку.</p>}
      {!readOnly ? <button type="button" className={ui.button} onClick={() => setOpen('add')}>Добавить фото</button> : null}
      <p className={f.hint}>Первое фото — главное: оно показывается в каталоге, поиске и на странице товара. Порядок меняется стрелками ←/→.</p>
      <MediaPicker open={open !== null} onOpenChange={next => { if (!next) setOpen(null); }} options={files} onPick={pick} title={open === 'add' ? 'Добавить фото' : 'Заменить файл'} />
    </>
  );
}
