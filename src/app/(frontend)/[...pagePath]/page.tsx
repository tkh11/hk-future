import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCMSPage, redirectOldCMSPath } from "@/content/cms-adapter";
import CmsBlocks from "@/cms/blocks/CmsBlocks";

type Props = { params: Promise<{ pagePath: string[] }> };
const pathFrom = (segments: string[]) => `/${segments.join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = pathFrom((await params).pagePath);
  const page = await getCMSPage(path);
  if (!page) {
    await redirectOldCMSPath(path);
    notFound();
  }
  return { title: `${page.title} — HEISSKRAFT` };
}

export default async function CMSPage({ params }: Props) {
  const path = pathFrom((await params).pagePath);
  const page = await getCMSPage(path);
  if (!page) {
    await redirectOldCMSPath(path);
    notFound();
  }
  return <main data-header-theme="light"><CmsBlocks blocks={page.blocks} /></main>;
}
