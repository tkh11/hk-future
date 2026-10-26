'use client';

import { useState } from 'react';
import styles from './EditorFields.module.css';
import { Button, useConfig, useDocumentInfo, useEditDepth, useForm, useFormBackgroundProcessing, useFormModified, useFormProcessing, useHotkey, useLocale } from '@payloadcms/ui';

/** Keeps Payload's draft endpoint and form pipeline, with explicit retry feedback. */
export default function SaveDraftControl() {
  const { config } = useConfig();
  const { id, collectionSlug, globalSlug, setUnpublishedVersionCount, uploadStatus } = useDocumentInfo();
  const { submit, setModified } = useForm();
  const modified = useFormModified();
  const processing = useFormProcessing();
  const background = useFormBackgroundProcessing();
  const locale = useLocale();
  const editDepth = useEditDepth();
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const disabled = saving || processing || background || uploadStatus === 'uploading' || (!!id && !modified);

  async function saveDraft() {
    if (disabled) return;
    setError(false); setSaving(true);
    const query = new URLSearchParams({ draft: 'true', depth: '0', 'fallback-locale': 'null' });
    if (locale?.code) query.set('locale', locale.code);
    const endpoint = collectionSlug ? `${config.routes.api}/${collectionSlug}${id ? `/${id}` : ''}` : `${config.routes.api}/globals/${globalSlug}`;
    try {
      const result = await submit({ action: `${endpoint}?${query}`, method: collectionSlug && id ? 'PATCH' : 'POST', overrides: { _status: 'draft' }, skipValidation: true });
      if (!result?.res.ok) { setError(true); setModified(true); }
      else setUnpublishedVersionCount(count => count + 1);
    } catch { setError(true); setModified(true); }
    finally { setSaving(false); }
  }
  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, event => {
    event.preventDefault(); event.stopPropagation(); void saveDraft();
  });
  return <div className={styles.draftControl}>
    <Button buttonId="action-save-draft" buttonStyle="secondary" size="medium" type="button" disabled={disabled} onClick={saveDraft}>{saving ? 'Сохраняется…' : 'Сохранить черновик'}</Button>
    {error && modified && <p className={styles.error} role="alert">Не удалось сохранить черновик. Данные остались в форме; повторите попытку.</p>}
  </div>;
}
