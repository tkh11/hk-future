import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductContent } from "@/content/cms-adapter";
import ProductScreen from "@/sections/products/ProductScreen";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductContent((await params).slug);
  if (!product) notFound();
  return { title: `${product.title} — HEISSKRAFT`, description: product.description };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductContent((await params).slug);
  if (!product) notFound();
  return <ProductScreen product={product} />;
}
