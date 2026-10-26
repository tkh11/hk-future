import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirectOldCMSPath, getProductContent } from "@/content/cms-adapter";
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
  return <ProductScreen product={product} />;
}
