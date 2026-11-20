'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { LibraryDocument } from '@/content/documents';
import { documentSize } from '@/lib/document-format';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { publicPath } from '@/lib/public-path';
import styles from './Documents.module.css';


function Cover({ document }: { document: LibraryDocument }) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.cover}>
    {document.cover && !failed
      ? <Image src={publicPath(document.cover)} alt={`Первая страница: ${document.title}`} width={560} height={792} unoptimized loading="lazy" onError={() => setFailed(true)} />
      : <span className={styles.coverFallback}><Image src={publicPath('/brand/small-black-logo.svg')} alt="HEISSKRAFT" width={96} height={96} /><span>PDF</span></span>}
    <span className={styles.coverAction}>Предпросмотр</span>
  </span>;
}

export default function DocumentsLibrary({ documents }: { documents: LibraryDocument[] }) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const [selected, setSelected] = useState<LibraryDocument | null>(null);
  const words = query.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim().split(/\s+/).filter(Boolean);
  const results = documents.filter(document => {
    const text = `${document.title} ${document.kind}`.toLocaleLowerCase('ru').replace(/ё/g, 'е');
    return words.every(word => text.includes(word));
  });

  return <main className={styles.page} data-header-theme="light">
    <header className={styles.heading}><h1>Каталоги и документация</h1><p>Всё о продукции HEISSKRAFT — в одном месте.</p></header>
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input type="search" aria-label="Поиск документов" placeholder="Поиск по названию документа" value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(24); }} />
      </label>
      <span className={styles.count} role="status">Найдено: {results.length}</span>
    </div>
    {results.length ? <ul className={styles.grid} aria-label="Каталоги и PDF-документы">
      {results.slice(0, visibleCount).map(document => <li key={document.id}>
        <button type="button" className={styles.card} onClick={() => setSelected(document)} aria-label={`Посмотреть документ: ${document.title}`} aria-haspopup="dialog">
          <Cover document={document} />
          <span className={styles.cardTitle}>{document.title}</span><span className={styles.meta}>{documentSize(document.bytes)}</span>
        </button>
      </li>)}
    </ul> : <div className={styles.empty}><h2>{documents.length ? 'Документы не найдены' : 'Документы готовятся к публикации'}</h2><p>{documents.length ? 'Попробуйте другое название или сбросьте поиск.' : 'Здесь появятся каталоги и документация на продукцию HEISSKRAFT.'}</p>{query && <button type="button" className={styles.more} onClick={() => setQuery('')}>Сбросить поиск</button>}</div>}
    {results.length > visibleCount && <div className={styles.moreRow}><button type="button" className={styles.more} onClick={() => setVisibleCount(count => count + 24)}>Показать ещё</button></div>}
    {selected && <DocumentPreview key={selected.id} document={selected} onClose={() => setSelected(null)} />}
  </main>;
}
