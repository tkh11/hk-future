'use client';

import { useRowLabel } from '@payloadcms/ui';

const roles: Record<string, string> = { main: 'Основное фото', preview: 'Миниатюра', gallery: 'Фото', technical: 'Чертёж' };

export default function GalleryRowLabel() {
  const { data, rowNumber } = useRowLabel<{ role?: string | null; caption?: string | null }>();
  const role = data?.role ? roles[data.role] ?? 'Фото' : 'Назначение не выбрано';
  return <span>{String((rowNumber ?? 0) + 1).padStart(2, '0')} · {role}{data?.caption ? ` — ${data.caption}` : ''}</span>;
}
