'use client';

import { useEffect } from 'react';
import { useForm, useAuth, useDocumentInfo, useFormModified, useFormProcessing, useFormBackgroundProcessing, useFormSubmitted, useFormFields } from '@payloadcms/ui';
import styles from './EditorFields.module.css';

export default function EditorStatus() {
  const { id, globalSlug, documentIsLocked, currentEditor, uploadStatus } = useDocumentInfo();
  const { user } = useAuth();
  const otherEditor = typeof currentEditor === 'object' ? currentEditor?.id : currentEditor;
  const lockedByOther = documentIsLocked && otherEditor != null && String(otherEditor) !== String(user?.id);
  const modified = useFormModified();
  const processing = useFormProcessing();
  const background = useFormBackgroundProcessing();
  const submitted = useFormSubmitted();
  const { setModified } = useForm();
  const failed = uploadStatus === 'failed' || (submitted && !processing && !background);
  useEffect(() => {
    // Payload clears modified on an HTTP error before handling its response.
    // Retain dirty state so a failed save can be retried without editing again.
    if (failed && !modified) setModified(true);
  }, [failed, modified, setModified]);
  const text = failed ? 'Не удалось сохранить. Проверьте поля и повторите попытку.'
    : processing || background ? 'Сохраняется…'
    : modified ? 'Есть несохранённые изменения'
    : id || globalSlug ? 'Сохранено' : 'Новая запись';
  return <div className={styles.status} role="status" aria-live="polite">
    <span>{text}</span>
    {globalSlug && <span>Изменения применятся сразу после сохранения.</span>}
    {lockedByOther && <strong>Запись редактирует другой сотрудник. Дождитесь завершения его работы.</strong>}
  </div>;
}

export function ProductReview() {
  const fields = useFormFields(([state]) => ({ title: state.title?.value, sku: state.sku?.value, slug: state.slug?.value, category: state.category?.value, image: state.image?.value }));
  const required = [{ label: 'Название', value: fields.title }, { label: 'Артикул', value: fields.sku }, { label: 'Адрес', value: fields.slug }, { label: 'Категория', value: fields.category }];
  return <section className={styles.review} aria-label="Проверка товара">
    <h3>Перед публикацией</h3>
    <ul>{required.map(item => <li key={item.label}>{item.label}: {item.value ? 'заполнено' : 'нужно заполнить'}</li>)}<li>Изображение: {fields.image ? 'выбрано' : 'пока не добавлено'}</li></ul>
    <p>Проверьте характеристики, документы и предпросмотр. Категория и связанные файлы должны быть опубликованы, чтобы посетители могли их увидеть.</p>
    <p>«Сохранить черновик» сохраняет работу для команды. «Опубликовать» делает изменения доступными на сайте. Восстановить предыдущую правку можно во вкладке версий.</p>
  </section>;
}
