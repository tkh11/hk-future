import type { ReactNode } from "react";
import { getCMSPage } from "@/content/cms-adapter";
import CmsBlocks from "@/cms/blocks/CmsBlocks";

/** A deliberately authored Page can replace a legacy composition. */
export default async function CMSPageOverride({ path, children }: { path: string; children: ReactNode }) {
  const page = await getCMSPage(path);
  if (!page) return children;
  return <main data-header-theme="light"><CmsBlocks blocks={page.blocks} /></main>;
}
