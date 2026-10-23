export type CatalogArt = "pipes" | "layers" | "pump" | "circulation" | "borehole" | "drainage" | "station" | "automation" | "auxiliary";

export type CatalogNode = {
  slug: string;
  title: string;
  art: CatalogArt;
  image?: string;
  tone?: "light";
  description?: string;
  children?: CatalogNode[];
};


export type CatalogEntry = { node: CatalogNode; path: string[]; trail: CatalogNode[] };

export function catalogHref(path: string[] = []) {
  return `/catalog${path.length ? `/${path.join("/")}` : ""}`;
}

export function getCatalogEntry(nodes: CatalogNode[], path: string[]): CatalogEntry | null {
  if (!path.length) return null;
  let level = nodes;
  const trail: CatalogNode[] = [];
  for (const slug of path) {
    const node = level.find(item => item.slug === slug);
    if (!node) return null;
    trail.push(node);
    level = node.children ?? [];
  }
  return { node: trail[trail.length - 1], path, trail };
}

export function getCatalogEntries(nodes: CatalogNode[], path: string[] = [], trail: CatalogNode[] = []): CatalogEntry[] {
  return nodes.flatMap(node => {
    const entry = { node, path: [...path, node.slug], trail: [...trail, node] };
    return [entry, ...getCatalogEntries(node.children ?? [], entry.path, entry.trail)];
  });
}

export function searchCatalog(entries: CatalogEntry[], query: string): CatalogEntry[] {
  const normalize = (value: string) => value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[-/]+/g, " ");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries.filter(entry => {
    const text = normalize(entry.trail.map(item => item.title).join(" "));
    return words.every(word => text.includes(word));
  });
}
