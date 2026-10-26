import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { cmsEnabled } from "@/cms/env";
import { getPublishedCMSPaths, filterPublicCMSPaths } from "@/content/cms-adapter";
import { articles } from "@/content/articles";
import { catalog } from "@/content/catalog";
import { getCatalogEntries } from "@/lib/catalog";
import { articleUrl } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!articleUrl("/")) return [];
  if (cmsEnabled()) await connection();
  const contentPaths = cmsEnabled() ? await getPublishedCMSPaths() : [
    ...getCatalogEntries(catalog).map((entry) => `/catalog/${entry.path.join("/")}`),
    ...articles.map((article) => `/articles/${article.slug}`),
  ];
  const paths = ["/", "/catalog", "/articles", "/contacts", "/designers", "/projects", "/warranty", "/solutions/data-centers", "/solutions/fire-suppression", ...contentPaths];
  return (await filterPublicCMSPaths([...new Set(paths)])).map((path) => ({ url: articleUrl(path)! }));
}
