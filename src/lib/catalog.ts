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

export const catalog: CatalogNode[] = [
  {
    slug: "pipelines", title: "Трубопроводные системы", art: "pipes",
    children: [
      { slug: "therm", title: "Heisskraft Therm", art: "pipes", image: "/images/catalog/therm.jpg", description: "Трубы и фитинги из полипропилена PP-R/PP-R CT для систем ХВС/ГВС/отопления/холодоснабжения" },
      { slug: "multilayer", title: "Heisskraft Multilayer", art: "layers", image: "/images/catalog/multilayer.jpg", description: "Трубы из термостойкого полиэтилена PE-RT тип I, PE-RT тип II и аксиальные фитинги для систем отопления" },
      { slug: "hdpe", title: "Heisskraft HDPE", art: "pipes", image: "/images/catalog/hdpe.jpg", description: "Трубы из полиэтилена высокой плотности низкого давления (PE100) и компрессионные фитинги к ним для систем технического/хозяйственно-бытового водоснабжения" },
      { slug: "fireoff", title: "Heisskraft FireOff", art: "pipes", image: "/images/catalog/fireoff.jpg", description: "Трубы и фитинги из огнестойкого компаунда полипропилена (PP-R-Compylen) для систем пожаротушения" },
      { slug: "black-pipe", title: "Heisskraft Black Pipe", art: "pipes", image: "/images/catalog/black-pipe.jpg", tone: "light", description: "Трубы и фитинги из полипропилена (PP) для систем промышленного/хозяйственно-бытового водоотведения" },
    ],
  },
  {
    slug: "pumps", title: "Насосное оборудование", art: "pump",
    children: [
      { slug: "pressure-boosting", title: "Повышение давления", art: "pump" },
      { slug: "circulation", title: "Циркуляционные", art: "circulation" },
      { slug: "borehole", title: "Скважинные", art: "borehole" },
      { slug: "drainage", title: "Дренажные", art: "drainage" },
      { slug: "sewage", title: "Канализационные", art: "drainage" },
      { slug: "stations", title: "Насосные станции", art: "station" },
      { slug: "automation", title: "Автоматика / принадлежности", art: "automation" },
    ],
  },
  { slug: "auxiliary", title: "Вспомогательное оборудование", art: "auxiliary" },
];

export type CatalogEntry = { node: CatalogNode; path: string[]; trail: CatalogNode[] };

export function catalogHref(path: string[] = []) {
  return `/catalog${path.length ? `/${path.join("/")}` : ""}`;
}

export function getCatalogEntry(path: string[]): CatalogEntry | null {
  if (!path.length) return null;
  let level = catalog;
  const trail: CatalogNode[] = [];
  for (const slug of path) {
    const node = level.find(item => item.slug === slug);
    if (!node) return null;
    trail.push(node);
    level = node.children ?? [];
  }
  return { node: trail[trail.length - 1], path, trail };
}

export function getCatalogEntries(nodes = catalog, path: string[] = [], trail: CatalogNode[] = []): CatalogEntry[] {
  return nodes.flatMap(node => {
    const entry = { node, path: [...path, node.slug], trail: [...trail, node] };
    return [entry, ...getCatalogEntries(node.children ?? [], entry.path, entry.trail)];
  });
}

export function searchCatalog(query: string): CatalogEntry[] {
  const normalize = (value: string) => value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[-/]+/g, " ");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return getCatalogEntries().filter(entry => {
    const text = normalize(entry.trail.map(item => item.title).join(" "));
    return words.every(word => text.includes(word));
  });
}
