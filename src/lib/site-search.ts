/** Public, serializable search previews; no CMS documents or private fields. */
export type SiteSearchEntry = {
  href: string;
  title: string;
  description: string;
  kind: "Раздел каталога" | "Продукт" | "Статья" | "Страница";
  image?: string;
  keywords?: string;
};

function normalize(value: string) {
  return value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Exact names and title matches rank ahead of matches only in supporting copy. */
export function searchSite(entries: readonly SiteSearchEntry[], query: string): SiteSearchEntry[] {
  const phrase = normalize(query);
  if (!phrase) return [];
  const words = phrase.split(/\s+/);
  const seen = new Set<string>();
  return entries.flatMap(entry => {
    if (seen.has(entry.href)) return [];
    seen.add(entry.href);
    const title = normalize(entry.title);
    const keywords = normalize(entry.keywords ?? "");
    const description = normalize(entry.description);
    const text = `${title} ${keywords} ${description}`;
    if (!words.every(word => text.includes(word))) return [];
    const score = (title === phrase ? 1000 : 0)
      + (title.startsWith(phrase) ? 200 : 0)
      + (title.includes(phrase) ? 100 : 0)
      + (keywords === phrase ? 160 : 0)
      + words.reduce((sum, word) => sum + (title.split(" ").some(token => token.startsWith(word)) ? 40 : title.includes(word) ? 25 : keywords.includes(word) ? 10 : 1), 0);
    return [{ entry, score }];
  }).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "ru") || a.entry.href.localeCompare(b.entry.href))
    .slice(0, 3).map(({ entry }) => entry);
}
