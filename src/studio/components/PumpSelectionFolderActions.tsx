'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPumpSelection, createPumpSelectionGroup, deletePumpSelectionGroup, renamePumpSelectionGroup } from '../pump-selection-actions';
import f from './form.module.css';
import ui from './ui.module.css';

export default function PumpSelectionFolderActions({ current, depth, parentHref }: {
  current: { id: number; title: string } | null; depth: number; parentHref: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'rename' | 'delete' | null>(null);
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const createLabel = ['Добавить серию', 'Добавить ряд', 'Добавить исполнение', 'Добавить насос'][depth];
  const open = (value: typeof mode) => { setMode(value); setError(''); setTitle(value === 'rename' ? current?.title ?? '' : ''); setSku(''); };
  return <div className={f.form}>
    <div className={f.actions}>
      <button className={ui.button} type="button" onClick={() => open('create')}>{createLabel}</button>
      {current && <>
        <button className={ui.button} type="button" onClick={() => open('rename')}>Переименовать</button>
        <button className={ui.button} type="button" onClick={() => open('delete')}>Удалить пустую группу</button>
      </>}
    </div>
    {mode && <form className={f.section} onSubmit={event => {
      event.preventDefault(); setError('');
      start(async () => {
        try {
          const result = mode === 'delete' && current ? await deletePumpSelectionGroup(current.id)
            : mode === 'rename' && current ? await renamePumpSelectionGroup(current.id, title)
            : depth === 3 && current ? await createPumpSelection({ sku, title, group: current.id })
            : await createPumpSelectionGroup({ title, parent: current?.id ?? null });
          if ('error' in result) { setError(result.error); return; }
          setMode(null);
          if ('href' in result && typeof result.href === 'string') router.push(result.href);
          else if (mode === 'delete') router.push(parentHref);
          else router.refresh();
        } catch { setError('Не удалось сохранить. Повторите попытку.'); }
      });
    }}>
      {mode === 'delete' ? <h2>Удалить «{current?.title}»?</h2> : <div className={f.grid}>
        {mode === 'create' && depth === 3 && <label className={f.field}>
          <span className={f.label}>Артикул</span>
          <input className={f.input} value={sku} onChange={event => setSku(event.target.value)} required maxLength={100} disabled={pending} />
        </label>}
        <label className={f.field}>
          <span className={f.label}>Название</span>
          <input className={f.input} value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} disabled={pending} />
        </label>
      </div>}
      {error && <p className={f.error} role="alert">{error}</p>}
      <div className={f.actions}>
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={pending}>
          {pending ? 'Сохранение…' : mode === 'delete' ? 'Удалить' : mode === 'rename' ? 'Сохранить' : depth === 3 ? 'Создать черновик' : 'Создать'}
        </button>
        <button className={ui.button} type="button" disabled={pending} onClick={() => open(null)}>Отмена</button>
      </div>
    </form>}
  </div>;
}
