'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LibraryDocument } from '@/content/documents';
import { documentSize } from '@/lib/document-format';
import { publicPath } from '@/lib/public-path';
import styles from './DocumentPreview.module.css';

export default function DocumentPreview({ document, onClose }: { document: LibraryDocument; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const previousFocus = window.document.activeElement as HTMLElement | null;
    const previousOverflow = window.document.body.style.overflow;
    const element = dialog.current!;
    element.showModal();
    window.document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      window.document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby="document-preview-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }} data-lenis-prevent>
    <div className={styles.previewPanel}>
      <header className={styles.previewHeader}>
        <div className={styles.previewTitle}><h2 id="document-preview-title">{document.title}</h2><p>{documentSize(document.bytes)}</p></div>
        <a href={publicPath(document.download)} className={styles.download} download data-analytics-goal="file_download">Скачать PDF</a>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть предпросмотр" autoFocus>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </header>
      <div className={styles.viewer}>
        {!loaded && <div className={styles.loading} role="status">Открываем документ…</div>}
        <iframe src={`${publicPath(document.preview)}#view=FitH`} title={`Предпросмотр: ${document.title}`} onLoad={() => setLoaded(true)} />
      </div>
      <footer className={styles.previewFooter}><span>Просмотр PDF</span><a href={publicPath(document.preview)} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке</a></footer>
    </div>
  </dialog>, window.document.body);
}

