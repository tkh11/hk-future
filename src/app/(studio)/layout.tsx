import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { cmsEnabled } from '@/cms/env';
import '@/studio/studio.css';

const text = localFont({
  variable: '--studio-font-text',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/sf-pro/SFProText-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/sf-pro/SFProText-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/sf-pro/SFProText-Semibold.woff2', weight: '600', style: 'normal' },
  ],
});

const display = localFont({
  variable: '--studio-font-display',
  display: 'swap',
  preload: false,
  src: [{ path: '../../../public/fonts/sf-pro/SFProDisplay-Semibold.woff2', weight: '600', style: 'normal' }],
});

export const metadata: Metadata = {
  title: { default: 'Каталог — HEISSKRAFT', template: '%s — Каталог HEISSKRAFT' },
  robots: { index: false, follow: false },
  icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/brand/whiteICON.svg' }],
};

export default function StudioRootLayout({ children }: { children: ReactNode }) {
  if (!cmsEnabled()) notFound();
  return (
    <html lang="ru" className={`${text.variable} ${display.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
