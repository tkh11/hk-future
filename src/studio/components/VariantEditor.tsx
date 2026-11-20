'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { colorLabel, colors, formatDate, profiles, reviewLabels, specFields, type ReviewState } from '../labels';
import { productHref } from '../routes';
import { publishVariant, saveVariant, unpublishVariant } from '../variant-actions';
import type { VariantEditorData } from '../variant-data';
import { variantDraftPatch, variantFieldLabels, type VariantValues } from '../variant-form';
import GalleryEditor from './GalleryEditor';
import { PublishBadge } from './parts';
import { Confirm, Field, SaveError, SaveStatus, Toc, savedLabel, type TocEntry } from './editor/parts';
import { useDraft } from './editor/useDraft';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

type Can = { edit: boolean; publish: boolean; admin: boolean };
export default function VariantEditor({ data, can }: { data: VariantEditorData; can: Can }) {
  const router = useRouter();
  const [busy, startAction] = useTransition();
  const [notice, setNotice] = useState('');
  const draft = useDraft<VariantValues>({
    initial: data.values,
    updatedAt: data.updatedAt,
    save: (patch, mode, previous) => saveVariant(data.id, variantDraftPatch(patch, previous), mode),
    lock: { collection: 'product-variants', id: data.id, holder: data.holder },
  });
  const { values: v, update, flush, status, errorFor } = draft;
  const readOnly = draft.readOnly;
  const specCols = specFields.filter(s => !v.profile || s.profiles.includes(v.profile));
  const parent = data.products.find(p => p.id === v.product);

  const toc: TocEntry[] = [
    { id: 's-main', title: 'Основное' },
    { id: 's-specs', title: 'Характеристики', meta: String(specCols.length) },
    { id: 's-packaging', title: 'Упаковка', attention: !v.packaging.unitsVerified },
    { id: 's-media', title: 'Медиа', meta: String(v.gallery.length), attention: v.gallery.length === 0 },
    { id: 's-service', title: 'Служебное' },
  ];

  const act = (run: () => Promise<{ ok: true } | { error: string }>, done: string) => startAction(async () => {
    setNotice('');
    const result = await run();
    if ('error' in result) return setNotice(result.error);
    setNotice(done);
    router.refresh();
  });

  const text = (path: 'title' | 'sku' | 'size' | 'connection', label: string) => (
    <Field path={path} label={label} error={errorFor(path)}>
      {props => <input {...props} className={`${f.input} ${path === 'sku' ? f.mono : ''}`} value={v[path]} onChange={e => update({ [path]: e.target.value } as Partial<VariantValues>)} />}
    </Field>
  );

  return (
    <>
      <header className={css.bar}>
        <nav className={css.crumbs} aria-label="Путь">
          <Link href="/studio/assortment/variants">Номенклатура</Link><span aria-hidden>/</span>
          {parent ? <><Link href={productHref(parent.id)}>{parent.title}</Link><span aria-hidden>/</span></> : null}
        </nav>
        <h1 className={css.title}>{v.sku ? `${v.sku} · ${v.title}` : v.title || 'Позиция'}</h1>
        <PublishBadge status={data.status} />
        <span className={css.spacer} />
        <SaveStatus status={status} />
        {can.publish ? (
          <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy || readOnly}
            onClick={() => act(async () => { if (!(await flush('save'))) return { error: 'Сначала исправьте ошибки сохранения.' }; return publishVariant(data.id, {}); }, 'Опубликовано.')}>
            {busy ? 'Публикую…' : data.status === 'published' ? 'Опубликовано' : 'Опубликовать'}
          </button>
        ) : null}
      </header>
      {readOnly ? (
        <div className={css.banner} data-tone="warning" role="status">
          <span>{draft.holder ? `Позицию редактирует ${draft.holder.name}.` : 'Коллега закончил редактирование. Обновите страницу.'}</span>
          <button type="button" className={`${ui.button} ${css.small}`} onClick={() => window.location.reload()}>Обновить</button>
        </div>
      ) : null}
      <SaveError status={status} labels={variantFieldLabels} />
      {notice ? <p className={css.banner} data-tone="warning" role="status">{notice}</p> : null}

      <div className={css.layout}>
        <Toc entries={toc} />
        <fieldset className={css.form} disabled={readOnly}>
          <legend className="visually-hidden">Позиция</legend>
          <p className={f.hint}>Данные, которые будут отображаться на сайте в карточке товара и таблице номенклатуры.</p>
          <section id="s-main" className={css.section}>
            <div className={css.sectionHead}><h2>Основное</h2></div>
            {text('sku', 'Артикул')}
            {text('title', 'Название')}
            <div className={css.row}>
              <Field path="product" label="Товар" error={errorFor('product')}>
                {props => (
                  <select {...props} className={f.select} value={v.product ?? ''} onChange={e => update({ product: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Не выбран</option>
                    {data.products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
              </Field>
              <Field path="profile" label="Тип продукции" error={errorFor('profile')}>
                {props => (
                  <select {...props} className={f.select} value={v.profile ?? ''} onChange={e => update({ profile: (e.target.value || null) as VariantValues['profile'] })}>
                    <option value="">Не выбран</option>
                    {profiles.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <div className={css.row}>
              {text('size', 'Размер')}
              {text('connection', 'Присоединение')}
              <Field path="color" label="Цвет">
                {props => (
                  <select {...props} className={f.select} value={v.color ?? ''} onChange={e => update({ color: (e.target.value || null) as VariantValues['color'] })}>
                    <option value="">Не указан</option>
                    {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </section>
          <section id="s-specs" className={css.section}>
            <div className={css.sectionHead}><h2>Характеристики</h2></div>
            <div className={css.row}>
              {specCols.map(col => (
                <Field key={col.key} path={`specs.${col.key}`} label={`${col.label}${col.unit ? `, ${col.unit}` : ''}`}>
                  {props => (
                    <input {...props} className={f.input} inputMode="decimal" value={v.specs[col.key] ?? ''}
                      onChange={e => {
                        const raw = e.target.value.replace(',', '.').trim();
                        const value = raw === '' ? null : Number(raw);
                        if (raw !== '' && Number.isNaN(value)) return;
                        update({ specs: { ...v.specs, [col.key]: value } });
                      }} />
                  )}
                </Field>
              ))}
            </div>
          </section>
          <section id="s-packaging" className={css.section}>
            <div className={css.sectionHead}><h2>Упаковка</h2></div>
            {(['weight', 'amount', 'volume'] as const).map(key => {
              const labels = { weight: 'Вес', amount: 'Количество', volume: 'Объём' };
              return (
                <div className={css.row} key={key}>
                  <Field path={`packaging.${key}Value`} label={labels[key]}>
                    {props => (
                      <input {...props} className={f.input} inputMode="decimal" value={v.packaging[`${key}Value`] ?? ''}
                        onChange={e => {
                          const raw = e.target.value.replace(',', '.').trim();
                          const value = raw === '' ? null : Number(raw);
                          if (raw !== '' && Number.isNaN(value)) return;
                          update({ packaging: { ...v.packaging, [`${key}Value`]: value } });
                        }} />
                    )}
                  </Field>
                  <Field path={`packaging.${key}Unit`} label="Единица">
                    {props => <input {...props} className={f.input} value={v.packaging[`${key}Unit`]} onChange={e => update({ packaging: { ...v.packaging, [`${key}Unit`]: e.target.value } })} />}
                  </Field>
                  <Field path={`packaging.${key}Note`} label="Примечание">
                    {props => <input {...props} className={f.input} value={v.packaging[`${key}Note`]} onChange={e => update({ packaging: { ...v.packaging, [`${key}Note`]: e.target.value } })} />}
                  </Field>
                </div>
              );
            })}
            <label className={f.check}>
              <input type="checkbox" checked={v.packaging.unitsVerified} onChange={e => update({ packaging: { ...v.packaging, unitsVerified: e.target.checked } })} />
              Единицы проверены
            </label>
          </section>
          <section id="s-media" className={css.section}>
            <div className={css.sectionHead}><h2>Медиа</h2><span className={css.aside}>{v.gallery.length ? `${v.gallery.length} файлов` : 'Нет фото'}</span></div>
            <GalleryEditor value={v.gallery} files={data.media} readOnly={readOnly} onChange={gallery => update({ gallery })} />
            {!v.gallery.length ? <p className={f.hint}>Если своих фото нет, на сайте показывается галерея товара.</p> : null}
          </section>
          <section id="s-service" className={css.section}>
            <div className={css.sectionHead}><h2>Служебное</h2></div>
            <Field path="sortOrder" label="Порядок">
              {props => <input {...props} className={f.input} inputMode="numeric" value={v.sortOrder ?? ''} onChange={e => update({ sortOrder: e.target.value === '' ? null : Math.trunc(Number(e.target.value)) || 0 })} />}
            </Field>
            <dl className={css.facts}>
              <dt>Цвет</dt><dd>{colorLabel(v.color)}</dd>
              <dt>Прежний адрес</dt><dd>{data.archive.sourceSlug || '—'}</dd>
              <dt>Прежние ID</dt><dd>{data.archive.legacyIds.join(', ') || '—'}</dd>
            </dl>
          </section>
        </fieldset>
        <aside className={css.inspector} aria-label="Сведения о позиции">
          <section className={css.panel}>
            <h3>Публикация</h3>
            <p className={css.panelText}>
              {data.status === 'draft' ? 'Не на сайте' : data.status === 'changed' ? 'На сайте · есть правки' : 'На сайте'}
            </p>
            <div className={css.actions}>
              {can.publish && data.status !== 'draft' ? (
                <Confirm trigger="Снять с сайта" className={`${ui.button} ${css.small}`} disabled={busy || readOnly} title="Снять позицию с сайта?"
                  text="Позиция исчезнет из таблицы на странице товара. Черновик сохранится."
                  confirm="Снять с сайта" onConfirm={() => act(() => unpublishVariant(data.id), 'Позиция снята с сайта.')} />
              ) : null}
            </div>
          </section>
          <section className={css.panel}>
            <h3>Внимание</h3>
            <div className={`${f.segmented} ${css.segmented}`} role="radiogroup" aria-label="Проверка данных">
              {(['ready', 'review', 'blocked'] as ReviewState[]).map(state => (
                <label key={state}>
                  <input type="radio" name="reviewState" value={state} checked={v.reviewState === state} disabled={readOnly} onChange={() => update({ reviewState: state })} />
                  <span>{reviewLabels[state]}</span>
                </label>
              ))}
            </div>
            <Field path="reviewNotes" label="Что нужно проверить" error={errorFor('reviewNotes')}>
              {props => <textarea {...props} className={f.textarea} rows={3} value={v.reviewNotes} disabled={readOnly} onChange={e => update({ reviewNotes: e.target.value })} />}
            </Field>
          </section>
          <section className={css.panel}>
            <h3>История версий</h3>
            {data.versions.length ? (
              <ul className={css.versions}>
                {data.versions.map(version => (
                  <li key={version.id}>
                    <span className={css.when} suppressHydrationWarning>{savedLabel(version.at)}</span>
                    <span className={css.kind}>{version.latest ? 'текущая' : version.autosave ? 'автосохранение' : version.status === 'published' ? 'опубликована' : 'черновик'}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={css.panelMuted}>Версий пока нет.</p>}
            <p className={css.panelMuted} suppressHydrationWarning>Сохранено {formatDate(data.updatedAt)}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
