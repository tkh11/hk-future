import config from '../../../payload.config';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import { notFound } from 'next/navigation';
import { cmsEnabled } from '@/cms/env';
import { importMap } from './admin/importMap';
import '@payloadcms/next/css';

const serverFunction: ServerFunctionClient = async (args) => {
  'use server';
  if (!cmsEnabled()) throw new Error('CMS is disabled.');
  return handleServerFunctions({ ...args, config, importMap });
};

export default function PayloadLayout({ children }: { children: React.ReactNode }) {
  if (!cmsEnabled()) notFound();
  return RootLayout({ children, config, importMap, serverFunction });
}
