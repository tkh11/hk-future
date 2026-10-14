import content from "@/data/articles.json";

export const articles = content;
export type Article = (typeof articles)[number];
export type ArticleSummary = Pick<Article, "slug" | "title" | "description" | "category" | "readingMinutes">;

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
