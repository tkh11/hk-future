'use client';

import { useEffect, useRef } from 'react';
import { TextField, useField } from '@payloadcms/ui';
import type { TextFieldClientProps } from 'payload';
import { suggestSlug } from '../admin-form-utils';

export default function SlugField(props: TextFieldClientProps) {
  const { value: title } = useField<string>({ path: 'title' });
  const { value, initialValue, setValue, disabled } = useField<string>({ path: props.path });
  const automatic = useRef(!initialValue);
  const previous = useRef(initialValue || '');
  useEffect(() => {
    if ((value ?? '') !== previous.current) automatic.current = false;
    if (!automatic.current || disabled || props.readOnly) return;
    const suggestion = suggestSlug(title || '');
    if (suggestion && value !== suggestion) { previous.current = suggestion; setValue(suggestion); }
  }, [disabled, props.readOnly, title, value, setValue]);
  return <TextField {...props} />;
}
