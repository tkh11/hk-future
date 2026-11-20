'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { LibraryDocument } from '@/content/documents';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { usePointerTilt } from '@/lib/use-pointer-tilt';
import { publicPath } from '@/lib/public-path';
import { documentSize } from '@/lib/document-format';
import styles from './Products.module.css';

function DocumentCard({ document, onSelect }: { document: LibraryDocument; onSelect: () => void }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt();
  const [failed, setFailed] = useState(false);
  return <button type="button" className={styles.documentCard} {...pointerHandlers} onClick={onSelect}
    aria-label={`Предпросмотр: ${document.title}`} aria-haspopup="dialog">
    <div className={styles.documentCover} ref={surfaceRef}>
      {document.cover && !failed
        ? <Image src={publicPath(document.cover)} alt={`Обложка: ${document.title}`} width={560} height={792} unoptimized loading="lazy" onError={() => setFailed(true)} />
        : <span className={styles.documentFallback}><Image src={publicPath('/brand/small-black-logo.svg')} alt="HEISSKRAFT" width={100} height={100} /><span>PDF</span></span>}
      <span className={styles.documentPreview}>Предпросмотр</span>
    </div>
    <span className={styles.documentTitle}>{document.title}</span>
    <span className={styles.documentMeta}>{documentSize(document.bytes)}</span>
  </button>;
}

export default function ProductDocuments({ documents }: { documents: LibraryDocument[] }) {
  const [selected, setSelected] = useState<LibraryDocument | null>(null);
  return <>
    {documents.length ? <ul className={styles.documentGrid} aria-label="Документы товара">
      {documents.map(document => <li key={document.id}><DocumentCard document={document} onSelect={() => setSelected(document)} /></li>)}
    </ul> : <p className={styles.emptyPanel}>Документы пока не добавлены.</p>}
    {selected && <DocumentPreview key={selected.id} document={selected} onClose={() => setSelected(null)} />}
  </>;
}
