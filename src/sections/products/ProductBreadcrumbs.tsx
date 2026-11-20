'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CatalogFloatingNav from '@/sections/catalog/CatalogFloatingNav';
import type { CatalogNode } from '@/lib/catalog';

export default function ProductBreadcrumbs({ path, trail, title, slug }: { path: string[]; trail: CatalogNode[]; title: string; slug: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  return <CatalogFloatingNav path={path} trail={trail} currentItem={{ title, href: `/products/${slug}` }}
    query={query} onQuery={setQuery} onClear={() => setQuery('')}
    onSubmit={event => { event.preventDefault(); router.push(query.trim() ? `/catalog?q=${encodeURIComponent(query.trim())}` : '/catalog'); }} />;
}
