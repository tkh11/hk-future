import config from '../../../../../payload.config';
import { RootPage, generatePageMetadata } from '@payloadcms/next/views';
import { importMap } from '../importMap';
import { cmsEnabled } from '@/cms/env';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[]>> };
export const dynamic = 'force-dynamic';
export function generateMetadata(props: Props) {
  return cmsEnabled() ? generatePageMetadata({ ...props, config }) : {};
}
export default function Page(props: Props) {
  if (!cmsEnabled()) notFound();
  return RootPage({ ...props, config, importMap });
}
