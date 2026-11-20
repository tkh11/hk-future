'use client';

import { useActionState, useState } from 'react';
import { suggestSlug } from '../form-utils';
import { createProduct } from '../product-actions';
import { productKinds } from '../product-form';
import f from './form.module.css';
import ui from './ui.module.css';

type Category = { id: number; title: string; path: string };
const indent = (path: string) => '— '.repeat(Math.max(0, path.split('/').length - 1));

export default function NewProductForm({ categories, category }: { categories: Category[]; category: string }) {
  const [state, action, pending] = useActionState(createProduct, undefined);
  const initial = state?.values;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const error = (path: string) => state?.fields?.find(x => x.path === path)?.message;
  const invalid = (path: string) => (error(path) ? { 'aria-invalid': true as const, 'aria-describedby': `n-${path}-error` } : {});

  return (
    <form action={action} className={`${f.form} ${f.section}`} style={{ maxWidth: 760 }} noValidate>
      {state?.error && !state.fields?.length ? <p className={f.alert} role="alert">{state.error}</p> : null}
      <div className={f.field}>
        <label htmlFor="n-title" className={f.label}>Название</label>
        <input id="n-title" name="title" className={f.input} required maxLength={200} autoFocus value={title} {...invalid('title')}
          onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(suggestSlug(e.target.value)); }} />
        {error('title') ? <p id="n-title-error" className={f.error}>{error('title')}</p> : null}
      </div>
      <div className={f.field}>
        <label htmlFor="n-category" className={f.label}>Раздел каталога</label>
        <select id="n-category" name="category" className={f.select} required defaultValue={initial?.category ?? category} {...invalid('category')}>
          <option value="">Выберите раздел</option>
          {categories.map(c => <option key={c.id} value={c.id}>{indent(c.path)}{c.title}</option>)}
        </select>
        {error('category') ? <p id="n-category-error" className={f.error}>{error('category')}</p> : null}
      </div>
      <fieldset className={f.field} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={f.label}>Как продаётся</legend>
        <div className={f.segmented}>
          {productKinds.map(kind => (
            <label key={kind.value}>
              <input type="radio" name="productKind" value={kind.value} defaultChecked={(initial?.productKind ?? 'family') === kind.value} />
              <span>{kind.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={f.field}>
        <label htmlFor="n-slug" className={f.label}><span>Адрес на сайте</span><span className={f.hint}>/products/{slug || '…'}</span></label>
        <input id="n-slug" name="slug" className={`${f.input} ${f.mono}`} required maxLength={150} value={slug} {...invalid('slug')}
          onChange={e => { setSlugTouched(true); setSlug(e.target.value.trim().toLowerCase()); }} />
        {error('slug') ? <p id="n-slug-error" className={f.error}>{error('slug')}</p> : <p className={f.hint}>Предлагается по названию. Латинские буквы, цифры и дефисы.</p>}
      </div>
      <div className={f.actions}>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={pending}>{pending ? 'Создаю…' : 'Создать черновик'}</button>
      </div>
    </form>
  );
}
