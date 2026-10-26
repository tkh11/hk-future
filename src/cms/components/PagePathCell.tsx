'use client';

import { useConfig } from '@payloadcms/ui';
import type { DefaultCellComponentProps, TextFieldClient } from 'payload';

export default function PagePathCell({ cellData, rowData }: DefaultCellComponentProps<TextFieldClient>) {
  const { config } = useConfig();
  const id: unknown = rowData.id;
  return <div><span>{cellData}</span>{(typeof id === 'number' || typeof id === 'string') && <div><a href={`${config.routes.api}/preview?collection=pages&id=${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer">Посмотреть</a></div>}</div>;
}
