import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirectOldCMSPath, getProductContent, getCatalogContent } from "@/content/cms-adapter";
import { getCatalogEntry } from '@/lib/catalog';
import ProductScreen from "@/sections/products/ProductScreen";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductContent(slug);
  if (!product) {
    await redirectOldCMSPath(`/products/${slug}`);
    notFound();
  }
  return { title: `${product.title} — HEISSKRAFT`, description: product.description };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductContent(slug);
  if (!product) {
    await redirectOldCMSPath(`/products/${slug}`);
    notFound();
  }
  const path = product.category?.path.split('/') ?? [];
  const trail = getCatalogEntry(await getCatalogContent(), path)?.trail.map(({ slug, title, art }) => ({ slug, title, art })) ?? [];
  return <ProductScreen key={product.slug} product={product} path={path} trail={trail} />;
}
