import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import Shell from '@/studio/components/Shell';
import { requireEditor } from '@/studio/session';
import '@/studio/studio.css';

const text = localFont({
  variable: '--studio-font-text',
  display: 'swap',
  src: [
    { path: '../../../../public/fonts/sf-pro/SFProText-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../../../public/fonts/sf-pro/SFProText-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../../../public/fonts/sf-pro/SFProText-Semibold.woff2', weight: '600', style: 'normal' },
  ],
});

const display = localFont({
  variable: '--studio-font-display',
  display: 'swap',
  preload: false,
  src: [{ path: '../../../../public/fonts/sf-pro/SFProDisplay-Semibold.woff2', weight: '600', style: 'normal' }],
});

export const metadata: Metadata = {
  title: { default: 'Каталог — HEISSKRAFT', template: '%s — Каталог HEISSKRAFT' },
  robots: { index: false, follow: false },
};

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { user, can } = await requireEditor();
  return (
    <html lang="ru" className={`${text.variable} ${display.variable}`}>
      <body>
        <Shell user={{ email: user.email, name: 'name' in user ? (user.name as string | null) : null }} admin={can.admin}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
