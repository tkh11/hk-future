import { catalog } from "@/content/catalog";
import { getCatalogContent } from "@/content/cms-adapter";
import { cmsEnabled } from "@/cms/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogEntries, getCatalogEntry } from "@/lib/catalog";
import CatalogScreen from "@/sections/catalog/CatalogScreen";


export function generateStaticParams() {
  return (cmsEnabled() ? [] : getCatalogEntries(catalog)).map(entry => ({ segments: entry.path }));
}

export async function generateMetadata({ params }: { params: Promise<{ segments: string[] }> }): Promise<Metadata> {
  const { segments } = await params;
  const entry = getCatalogEntry(await getCatalogContent(), segments);
  if (!entry) notFound();
  return { title: `${entry.node.title} — Каталог HEISSKRAFT`, description: `${entry.node.title} в каталоге HEISSKRAFT.` };
}

export default async function CatalogCategoryPage({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  if (!getCatalogEntry(await getCatalogContent(), segments)) notFound();
  return <CatalogScreen path={segments} />;
}
