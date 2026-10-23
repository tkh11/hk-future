import { articles } from "@/content/articles";
export { articles };
export type { Article, ArticleSummary } from "@/content/types";


export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

// Set the final public origin before launch. Never canonicalize a preview to the old site.
export function articleUrl(path: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return `${url.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
  } catch {
    return undefined;
  }
}
