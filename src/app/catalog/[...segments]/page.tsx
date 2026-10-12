import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogEntries, getCatalogEntry } from "@/lib/catalog";
import CatalogScreen from "@/sections/catalog/CatalogScreen";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCatalogEntries().map(entry => ({ segments: entry.path }));
}

export async function generateMetadata({ params }: { params: Promise<{ segments: string[] }> }): Promise<Metadata> {
  const { segments } = await params;
  const entry = getCatalogEntry(segments);
  if (!entry) notFound();
  return { title: `${entry.node.title} — Каталог HEISSKRAFT`, description: `${entry.node.title} в каталоге HEISSKRAFT.` };
}

export default async function CatalogCategoryPage({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  if (!getCatalogEntry(segments)) notFound();
  return <CatalogScreen path={segments} />;
}
