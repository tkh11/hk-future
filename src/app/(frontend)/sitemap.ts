import type { MetadataRoute } from "next";
import { cmsEnabled } from "@/cms/env";
import { getPublishedCMSPaths, filterPublicCMSPaths } from "@/content/cms-adapter";
import { articles } from "@/content/articles";
import { catalog } from "@/content/catalog";
import { getCatalogEntries } from "@/lib/catalog";
import { articleUrl } from "@/lib/articles";

// The deployment URL and published CMS content can change after the build.
// The frozen export explicitly replaces this with force-static in its staging tree.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!articleUrl("/")) return [];
  const contentPaths = cmsEnabled() ? await getPublishedCMSPaths() : [
    ...getCatalogEntries(catalog).map((entry) => `/catalog/${entry.path.join("/")}`),
    ...articles.map((article) => `/articles/${article.slug}`),
  ];
  const paths = ["/", "/catalog", "/docs", "/articles", "/contacts", "/designers", "/projects", "/warranty", "/solutions/data-centers", "/solutions/fire-suppression", ...contentPaths];
  return (await filterPublicCMSPaths([...new Set(paths)])).map((path) => ({ url: articleUrl(path)! }));
}
