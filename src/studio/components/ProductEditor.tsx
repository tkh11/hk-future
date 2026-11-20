'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { suggestSlug } from '../form-utils';
import { formatDate, profiles, reviewLabels, type ReviewState } from '../labels';
import { publishProduct, restoreProductVersion, saveProduct, unpublishProduct } from '../product-actions';
import type { ProductEditorData } from '../product-data';
import { differences, fieldLabels, productKinds, readiness, SUMMARY_LIMIT, type ProductValues } from '../product-form';
import { PublishBadge } from './parts';
import GalleryEditor from './GalleryEditor';
import VariantsInline from './VariantsInline';
import { Confirm, Field, focusField, SaveError, SaveStatus, Toc, savedLabel, type TocEntry } from './editor/parts';
import { useDraft } from './editor/useDraft';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

type Can = { edit: boolean; publish: boolean; admin: boolean };
const indent = (path: string) => '— '.repeat(Math.max(0, path.split('/').length - 1));

export default function ProductEditor({ data, can }: { data: ProductEditorData; can: Can }) {
  const router = useRouter();
  const [startedLocked] = useState(data.holder !== null);
  const [busy, startAction] = useTransition();
  const [notice, setNotice] = useState('');
  const draft = useDraft<ProductValues>({
    initial: data.values,
    updatedAt: data.updatedAt,
    save: (patch, mode) => saveProduct(data.id, patch, mode),
    lock: { collection: 'products', id: data.id, holder: data.holder },
  });
  const { values: v, update, flush, status, errorFor } = draft;
  const readOnly = draft.readOnly || startedLocked;

  const categoryNames = useMemo(() => new Map(data.categories.map(c => [c.id, c.title])), [data.categories]);
  const ready = readiness(v, { ...data.facts, documents: v.catalogDocuments.filter(d => d.visible).length });
  const blockers = ready.filter(item => item.blocking && !item.ok);
  const changes = data.published ? differences(data.published, v, categoryNames) : [];
  const category = data.categories.find(c => c.id === v.category);
  const emptyTexts = [v.summary, v.description].filter(t => !t.trim()).length;

  const toc: TocEntry[] = [
    { id: 's-main', title: 'Информация для карточки' },
    { id: 's-description', title: 'Описание', meta: emptyTexts ? `${emptyTexts} пусто` : undefined, attention: emptyTexts > 0 },
    { id: 's-media', title: 'Медиа', meta: String(v.gallery.length), attention: v.gallery.length === 0 },
    { id: 's-variants', title: 'Номенклатура', meta: String(data.facts.variants) },
    { id: 's-documents', title: 'Документы', meta: String(v.catalogDocuments.length) },
    { id: 's-service', title: 'Служебное' },
  ];

  const act = (run: () => Promise<{ ok: true } | { error: string }>, done: string, reload = false) => startAction(async () => {
    setNotice('');
    const result = await run();
    if ('error' in result) return setNotice(result.error);
    setNotice(done);
    if (reload) window.location.reload();
    else router.refresh();
  });

  const publish = () => act(async () => {
    if (!(await flush('save'))) return { error: 'Сначала исправьте ошибки сохранения.' };
    return publishProduct(data.id, {});
  }, 'Опубликовано.');

  const preview = async () => {
    const tab = window.open('', '_blank');
    await flush('save');
    if (tab) tab.location.href = `/api/preview?collection=products&id=${data.id}`;
  };

  const text = (path: 'title' | 'sku' | 'externalId' | 'titleEn', label: string, hint?: string) => (
    <Field path={path} label={label} hint={hint} error={errorFor(path)}>
      {props => <input {...props} className={`${f.input} ${path === 'sku' || path === 'externalId' ? f.mono : ''}`} value={v[path]} onChange={e => update({ [path]: e.target.value } as Partial<ProductValues>)} />}
    </Field>
  );
  const area = (path: 'description' | 'characteristics' | 'documentsText' | 'videoText' | 'descriptionEn' | 'characteristicsEn' | 'documentsTextEn', label: string, rows = 4, hint?: string) => (
    <Field path={path} label={label} hint={hint} error={errorFor(path)} aside={v[path] ? `${v[path].length.toLocaleString('ru-RU')} симв.` : undefined}>
      {props => <textarea {...props} className={f.textarea} rows={rows} value={v[path]} onChange={e => update({ [path]: e.target.value } as Partial<ProductValues>)} />}
    </Field>
  );

  return (
    <>
      <header className={css.bar}>
        <nav className={css.crumbs} aria-label="Путь">
          <Link href="/studio/assortment">Ассортимент</Link><span aria-hidden>/</span>
          {category ? <><span>{category.title}</span><span aria-hidden>/</span></> : null}
        </nav>
        <h1 className={css.title}>{v.title || 'Без названия'}</h1>
        <PublishBadge status={data.status} />
        <span className={css.spacer} />
        <SaveStatus status={status} />
        <button type="button" className={ui.button} onClick={preview}>Предпросмотр</button>
        {can.publish ? (
          <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy || readOnly || blockers.length > 0} onClick={publish}
            title={blockers.length ? `Не готово: ${blockers.map(b => b.label).join(', ')}` : undefined}>
            {busy ? 'Публикую…' : data.status === 'published' && !changes.length ? 'Опубликовано' : 'Опубликовать'}
          </button>
        ) : null}
      </header>

      {readOnly ? (
        <div className={css.banner} data-tone="warning" role="status">
          <span>{draft.holder ? `Карточку редактирует ${draft.holder.name}. Пока коллега не закончит, правки недоступны.` : 'Коллега закончил редактирование. Обновите карточку, чтобы увидеть его правки.'}</span>
          <button type="button" className={`${ui.button} ${css.small}`} onClick={() => window.location.reload()}>Обновить</button>
        </div>
      ) : null}
      <SaveError status={status} labels={{ ...fieldLabels, catalogDocuments: 'Документы' }} />
      {notice ? <p className={css.banner} data-tone="warning" role="status">{notice}</p> : null}

      <div className={css.layout}>
        <Toc entries={toc} />

        <fieldset className={css.form} disabled={readOnly}>
          <legend className="visually-hidden">Карточка товара</legend>
          <section id="s-main" className={css.section} aria-labelledby="h-main">
            <div className={css.sectionHead}><h2 id="h-main">Информация для карточки</h2></div>
            {text('title', 'Название')}
            <div className={css.row}>
              <Field path="category" label="Раздел каталога" error={errorFor('category')} hint={category && !data.facts.categoryPublished ? 'Раздел не опубликован: посетители не увидят товар.' : undefined}>
                {props => (
                  <select {...props} className={f.select} value={v.category ?? ''} onChange={e => update({ category: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Выберите раздел</option>
                    {data.categories.map(c => <option key={c.id} value={c.id}>{indent(c.path)}{c.title}</option>)}
                  </select>
                )}
              </Field>
              <Field path="profile" label="Тип продукции" hint="Задаёт колонки характеристик у позиций." error={errorFor('profile')}>
                {props => (
                  <select {...props} className={f.select} value={v.profile ?? ''} onChange={e => update({ profile: (e.target.value || null) as ProductValues['profile'] })}>
                    <option value="">Не выбран</option>
                    {profiles.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <div className={f.field} role="radiogroup" aria-labelledby="f-productKind-label" id="f-productKind" tabIndex={-1}>
              <span id="f-productKind-label" className={f.label}>Как продаётся</span>
              <div className={f.segmented}>
                {productKinds.map(kind => (
                  <label key={kind.value}>
                    <input type="radio" name="productKind" value={kind.value} checked={v.productKind === kind.value} onChange={() => update({ productKind: kind.value })} />
                    <span>{kind.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {v.productKind === 'single' ? text('sku', 'Артикул', 'Артикул производителя. Без него карточку с одним артикулом не опубликовать.') : null}
            <details className={css.details}>
              <summary>Также показывать в разделах{v.additionalCategories.length ? ` · ${v.additionalCategories.length}` : ''}</summary>
              <div className={css.checks} id="f-additionalCategories">
                {data.categories.filter(c => c.id !== v.category).map(c => (
                  <label key={c.id} className={f.check}>
                    <input type="checkbox" checked={v.additionalCategories.includes(c.id)}
                      onChange={e => update({ additionalCategories: e.target.checked ? [...v.additionalCategories, c.id] : v.additionalCategories.filter(id => id !== c.id) })} />
                    {c.title}
                  </label>
                ))}
              </div>
            </details>
          </section>

          <section id="s-description" className={css.section} aria-labelledby="h-description">
            <div className={css.sectionHead}><h2 id="h-description">Описание</h2></div>
            <Field path="summary" label="Краткое описание" error={errorFor('summary')}
              aside={<span className={css.counter} data-over={v.summary.length > SUMMARY_LIMIT || undefined}>{v.summary.length} из {SUMMARY_LIMIT}</span>}
              hint={v.summary.length > SUMMARY_LIMIT ? 'Длиннее 160 символов: в карточке каталога и поиске текст обрежется.' : 'Краткая аннотация товара.'}>
              {props => <textarea {...props} className={f.textarea} rows={2} value={v.summary} onChange={e => update({ summary: e.target.value })} />}
            </Field>
            {area('description', 'Описание', 10, 'Markdown: заголовки, списки, выделение и таблицы.')}
            {area('characteristics', 'Общие технические характеристики', 6, 'Общие параметры товара. Поддерживается Markdown.')}
          </section>

          <section id="s-media" className={css.section} aria-labelledby="h-media" tabIndex={-1}>
            <div className={css.sectionHead}><h2 id="h-media">Медиа</h2><span className={css.aside}>{v.gallery.length ? `${v.gallery.length} файлов` : 'Нет фото'}</span></div>
            <GalleryEditor value={v.gallery} files={data.media} readOnly={readOnly} onChange={gallery => update({ gallery })} />
          </section>

          <section id="s-variants" className={css.section} aria-labelledby="h-variants" tabIndex={-1}>
            <div className={css.sectionHead}>
              <h2 id="h-variants">Номенклатура</h2>
              <span className={css.aside}><Link className={css.link} href={`/studio/assortment/variants?product=${data.id}`}>Вся номенклатура товара</Link></span>
            </div>
            <VariantsInline key={`${data.variants.page}-${data.variants.limit}-${data.variants.rows.map(row => row.id).join(',')}`}
              productId={data.id} profile={v.profile} initial={data.variants.rows} pagination={data.variants} readOnly={readOnly} />
          </section>

          <section id="s-documents" className={css.section} aria-labelledby="h-documents" tabIndex={-1}>
            <div className={css.sectionHead}><h2 id="h-documents">Документы</h2><span className={css.aside}>{v.catalogDocuments.length} в библиотеке</span></div>
            {v.catalogDocuments.length ? (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className="visually-hidden">Документы товара</caption>
                  <thead><tr><th>Документ</th><th>Вид</th><th>На странице товара</th></tr></thead>
                  <tbody>
                    {v.catalogDocuments.map((row, index) => {
                      const info = data.documents.find(d => d.id === row.document);
                      return (
                        <tr key={row.id ?? `${row.document}-${index}`}>
                          <td className={ui.wide}>{info?.title ?? `Документ ${row.document}`}{info && !info.published ? <span className={ui.rowMeta}>Документ не опубликован</span> : null}</td>
                          <td className={ui.muted}>{info?.kind || '—'}</td>
                          <td>
                            <label className={f.check}>
                              <input type="checkbox" checked={row.visible} onChange={e => update({ catalogDocuments: v.catalogDocuments.map((r, i) => (i === index ? { ...r, visible: e.target.checked } : r)) })} />
                              {row.visible ? 'Показан' : 'Скрыт'}
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className={css.panelText}>К товару не привязаны документы.</p>}
            {!readOnly ? (
              <label className={f.field}>
                <span className={f.label}>Из библиотеки</span>
                <select className={f.select} value="" onChange={e => {
                  const id = Number(e.target.value);
                  if (!id || v.catalogDocuments.some(row => row.document === id)) return;
                  update({ catalogDocuments: [...v.catalogDocuments, { document: id, visible: true }] });
                }}>
                  <option value="">Выберите документ</option>
                  {data.documents.filter(d => !v.catalogDocuments.some(row => row.document === d.id)).map(d => (
                    <option key={d.id} value={d.id}>{d.title}{d.published ? '' : ' · черновик'}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {area('documentsText', 'Примечания к документам', 3)}
            {area('videoText', 'Примечания к видео', 3)}
          </section>

          <section id="s-service" className={css.section} aria-labelledby="h-service">
            <div className={css.sectionHead}><h2 id="h-service">Служебное</h2></div>
            <Field path="slug" label="Адрес на сайте" error={errorFor('slug')}
              hint={data.liveSlug && v.slug !== data.liveSlug ? `После публикации старый адрес /products/${data.liveSlug} будет перенаправлять на новый.` : `Страница товара: /products/${v.slug || '…'}`}>
              {props => (
                <div className={css.inline}>
                  <input {...props} className={`${f.input} ${f.mono}`} value={v.slug} onChange={e => update({ slug: e.target.value.trim().toLowerCase() })} />
                  <button type="button" className={ui.button} disabled={!v.title.trim() || suggestSlug(v.title) === v.slug} onClick={() => update({ slug: suggestSlug(v.title) })}>Из названия</button>
                </div>
              )}
            </Field>
            <div className={css.row}>
              {text('externalId', 'ID в 1С или другой системе', 'Меняйте только вместе с ответственным за обмен.')}
              <Field path="sortOrder" label="Порядок в разделе" hint="Меньше — выше в списке." error={errorFor('sortOrder')}>
                {props => <input {...props} className={f.input} inputMode="numeric" value={v.sortOrder ?? ''} onChange={e => update({ sortOrder: e.target.value === '' || Number.isNaN(Number(e.target.value)) ? null : Math.trunc(Number(e.target.value)) })} />}
              </Field>
            </div>
            <dl className={css.facts}>
              <dt>Прежний адрес</dt><dd>{data.archive.sourceSlug || '—'}</dd>
              <dt>Прежние ID</dt><dd>{data.archive.legacyIds.join(', ') || '—'}</dd>
              <dt>Архив старого сайта</dt><dd>{data.archive.resources ? `${data.archive.resources} материалов, хранятся для справки` : '—'}</dd>
            </dl>
            <details className={css.details}>
              <summary>Перевод на английский</summary>
              <div className={f.form}>
                {text('titleEn', 'Название EN')}
                {area('descriptionEn', 'Описание EN', 6)}
                {area('characteristicsEn', 'Характеристики EN', 4)}
                {area('documentsTextEn', 'Документы EN', 3)}
              </div>
            </details>
          </section>
        </fieldset>

        <aside className={css.inspector} aria-label="Сведения о карточке">
          <section className={css.panel}>
            <h3>Публикация</h3>
            <p className={css.panelText}>
              {data.status === 'draft' ? 'Не на сайте' : data.status === 'changed' || changes.length ? 'На сайте · есть правки' : 'На сайте'}
              {data.publishedAt ? <span className={css.panelMuted}> · опубликовано {formatDate(data.publishedAt)}</span> : null}
            </p>
            {changes.length ? (
              <details className={css.details} open={changes.length <= 4}>
                <summary>Было / Станет · {changes.length}</summary>
                <ul className={css.diff}>
                  {changes.map(change => <li key={change.field}><strong>{change.label}</strong><del>{change.before}</del><ins>{change.after}</ins></li>)}
                </ul>
              </details>
            ) : data.published ? <p className={css.panelMuted}>Черновых правок нет.</p> : null}
            {!can.publish ? (
              <>
                <p className={css.panelMuted}>Публикует публикующий редактор.</p>
                <label className={f.check}>
                  <input type="checkbox" checked={v.publicationRequested} disabled={readOnly} onChange={e => update({ publicationRequested: e.target.checked })} />
                  Отправить на публикацию
                </label>
              </>
            ) : v.publicationRequested ? <p className={css.panelText}>Редактор отправил карточку на публикацию.</p> : null}
            <div className={css.actions}>
              {data.liveSlug ? <a className={`${ui.button} ${css.small}`} href={`/products/${data.liveSlug}`} target="_blank" rel="noreferrer">Открыть на сайте</a> : null}
              {can.publish && data.published ? (
                <Confirm trigger="Снять с сайта" className={`${ui.button} ${css.small}`} disabled={busy || readOnly} title="Снять товар с сайта?"
                  text="Страница товара перестанет открываться, карточка исчезнет из каталога и поиска. Черновик и история сохранятся."
                  confirm="Снять с сайта" onConfirm={() => act(() => unpublishProduct(data.id), 'Товар снят с сайта.')} />
              ) : null}
            </div>
          </section>

          <section className={css.panel}>
            <h3>Готовность · {ready.filter(i => i.ok).length} из {ready.length}</h3>
            <ul className={css.ready}>
              {ready.map(item => (
                <li key={item.key}>
                  <button type="button" data-ok={item.ok} onClick={() => focusField(item.field)}>
                    <span className={css.dot} data-ok={item.ok} data-blocking={item.blocking} aria-hidden />
                    {item.label}
                    <span className="visually-hidden">{item.ok ? ' — готово' : item.blocking ? ' — нужно для публикации' : ' — не заполнено'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {blockers.length ? <p className={css.panelMuted}>Красные пункты не дают опубликовать карточку.</p> : null}
          </section>

          <section className={css.panel}>
            <h3>Внимание</h3>
            <div className={`${f.segmented} ${css.segmented}`} role="radiogroup" aria-label="Проверка данных" id="f-reviewState" tabIndex={-1}>
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
            {errorFor('reviewState') ? <p className={f.error}>{errorFor('reviewState')}</p> : null}
          </section>

          <section className={css.panel}>
            <h3>История версий</h3>
            {data.versions.length ? (
              <ul className={css.versions}>
                {data.versions.map(version => (
                  <li key={version.id}>
                    <span className={css.when} suppressHydrationWarning>{savedLabel(version.at)}</span>
                    <span className={css.kind}>{version.latest ? 'текущая' : version.status === 'published' ? 'опубликована' : version.autosave ? 'автосохранение' : 'черновик'}</span>
                    {!version.latest ? (
                      <Confirm trigger="Вернуть" className={`${ui.button} ${ui.ghost} ${css.small}`} disabled={busy || readOnly} title="Вернуть эту версию?"
                        text="Карточка в черновике станет такой, как в выбранной версии. Текущие правки сохранятся в истории. На сайте ничего не изменится до публикации."
                        confirm="Вернуть версию" onConfirm={() => act(() => restoreProductVersion(data.id, version.id), 'Версия восстановлена.', true)} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : <p className={css.panelMuted}>Версий пока нет.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
