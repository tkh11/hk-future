import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCMSPage } from "@/content/cms-adapter";
import CmsBlocks from "@/cms/blocks/CmsBlocks";

type Props = { params: Promise<{ pagePath: string[] }> };
const pathFrom = (segments: string[]) => `/${segments.join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getCMSPage(pathFrom((await params).pagePath));
  if (!page) notFound();
  return { title: `${page.title} — HEISSKRAFT` };
}

export default async function CMSPage({ params }: Props) {
  const page = await getCMSPage(pathFrom((await params).pagePath));
  if (!page) notFound();
  return <main data-header-theme="light"><CmsBlocks blocks={page.blocks} /></main>;
}
