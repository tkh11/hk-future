export type PipelineSystemId = "hot" | "cold";

export type PipelineSystem = {
  id: PipelineSystemId;
  /** Functional identifier used across engineering drawings. */
  title: string;
  full: string;
  /** Engineering colour code — see DESIGN_SYSTEM.md §18. */
  color: string;
};

export const PIPELINE_SYSTEMS: PipelineSystem[] = [
  { id: "hot", title: "ГВС", full: "Горячее водоснабжение", color: "#c8102e" },
  { id: "cold", title: "ХВС", full: "Холодное водоснабжение", color: "#1a5fb4" },
];

export type PipelineProduct = {
  id: string;
  index: string;
  title: string;
  description: string;
  href: string;
  /** Product photo; the panel falls back to a branded placeholder while null. */
  photo: string | null;
  /** Fragment of the glTF node name that identifies this product. */
  match: string;
  /**
   * Revit element ids per system. The first id of each list is the instance the
   * camera flies to when the product is picked from the list, so it is the
   * largest or most legible one.
   */
  elements: Record<PipelineSystemId, string[]>;
};

/**
 * communications.glb ships without materials or system names, so the two
 * circuits were separated geometrically: linking every pipe and fitting to its
 * neighbours with a 1 mm tolerance splits the floor into exactly two chains.
 * The chain on the riser at x≈6.20 is ГВС — it feeds the left (hot) side of both
 * basin mixers and of the shower column; the chain on the riser at x≈6.43 is
 * ХВС — it also feeds the wall-hung WC, which takes cold water only.
 */
export const PIPELINE_PRODUCTS: PipelineProduct[] = [
  {
    id: "kraftpipe-plus-sdr-7-4",
    index: "01",
    title: "Труба KraftPipePlus SDR 7.4",
    description:
      "Полипропиленовая труба HEISSKRAFT. В модели из неё собраны стояки, транзит по этажу и подводки к приборам.",
    href: "/catalog?product=kraftpipe-plus-sdr-7-4",
    photo: null,
    match: "KraftPipePlus",
    elements: {
      hot: [
        "679101",
        "680576",
        "680585",
        "682880",
        "683911",
        "683921",
        "687532",
        "687541",
        "687735",
        "687736",
        "687786",
        "687790",
        "687791",
        "687970",
        "687982",
        "687983",
        "687995",
        "688021",
        "688030",
        "688698",
        "688710",
      ],
      cold: [
        "631653",
        "631859",
        "631874",
        "636933",
        "640673",
        "640897",
        "641181",
        "662779",
        "662786",
        "662826",
        "668074",
        "669060",
        "675583",
        "675593",
        "675603",
        "677690",
        "678109",
        "680636",
      ],
    },
  },
  {
    id: "trojnik-perehodnyj",
    index: "02",
    title: "Тройник переходный",
    description:
      "Ответвление от стояка со сменой диаметра — от него начинается поэтажная подводка.",
    href: "/catalog?product=trojnik-perehodnyj",
    photo: null,
    match: "Тройник_переходный",
    elements: {
      hot: ["680584", "687540", "687788", "687994", "688029"],
      cold: ["631873", "632904", "640528", "640832", "641144", "662825"],
    },
  },
  {
    id: "koleno",
    index: "03",
    title: "Колено",
    description:
      "Поворот трассы при обходе конструкций и при подъёме подводки к прибору.",
    href: "/catalog?product=koleno",
    photo: null,
    match: "Колено",
    elements: {
      hot: [
        "687122",
        "683554",
        "683923",
        "687741",
        "687749",
        "687794",
        "687796",
        "687986",
        "687998",
        "688706",
        "689659",
      ],
      cold: ["662831", "675601", "675623", "680638", "680644"],
    },
  },
  {
    id: "koleno-kombinirovannoe-nr",
    index: "04",
    title: "Колено комбинированное с НР",
    description:
      "Поворот с переходом на наружную резьбу — им подводка заканчивается у прибора.",
    href: "/catalog?product=koleno-kombinirovannoe-nr",
    photo: null,
    match: "Колено_комбинированное",
    elements: {
      hot: ["684014"],
      cold: ["678249"],
    },
  },
  {
    id: "mufta-kombinirovannaya-nr",
    index: "05",
    title: "Муфта комбинированная с НР",
    description:
      "Соединение полипропиленовой трассы с резьбовым присоединением арматуры и приборов.",
    href: "/catalog?product=mufta-kombinirovannaya-nr",
    photo: null,
    match: "Муфта_комбинированная",
    elements: {
      hot: ["687929", "687585", "687842", "689266"],
      cold: ["638993", "668810", "669062", "675698"],
    },
  },
  {
    id: "kollektor-kombinirovannyj-4",
    index: "06",
    title: "Коллектор комбинированный на 4 выхода с НР",
    description:
      "Распределяет воду по четырём резьбовым отводам — в модели собирает группу приборов.",
    href: "/catalog?product=kollektor-kombinirovannyj-4",
    photo: null,
    match: "Коллектор_комбинированный",
    elements: {
      hot: [],
      cold: ["663864"],
    },
  },
  {
    id: "zaglushka",
    index: "07",
    title: "Заглушка",
    description: "Герметизирует неиспользуемый отвод коллектора.",
    href: "/catalog?product=zaglushka",
    photo: null,
    match: "Заглушка",
    elements: {
      hot: [],
      cold: ["667365"],
    },
  },
];

export type PipelineElement = {
  id: string;
  product: PipelineProduct;
  /** null for an instance the id table above does not know yet. */
  system: PipelineSystem | null;
};

const systemById = new Map(PIPELINE_SYSTEMS.map((system) => [system.id, system]));
const productById = new Map(PIPELINE_PRODUCTS.map((product) => [product.id, product]));

const elementById = new Map<string, PipelineElement>();

for (const product of PIPELINE_PRODUCTS) {
  for (const system of PIPELINE_SYSTEMS) {
    for (const id of product.elements[system.id]) {
      elementById.set(id, { id, product, system });
    }
  }
}

/**
 * Longest match first: "Колено комбинированное НР" also contains "Колено", and
 * the plain elbow must not swallow it.
 */
const matchers = [...PIPELINE_PRODUCTS].sort((a, b) => b.match.length - a.match.length);

export function findPipelineElement(id: string | null) {
  return id ? (elementById.get(id) ?? null) : null;
}

export function findPipelineProduct(id: string | null) {
  return id ? (productById.get(id) ?? null) : null;
}

export function pipelineSystem(id: PipelineSystemId) {
  return systemById.get(id)!;
}

export function pipelineProductCount(product: PipelineProduct) {
  return product.elements.hot.length + product.elements.cold.length;
}

/**
 * Picks the instance the camera flies to when a product is chosen from the list,
 * preferring the system the visitor has isolated.
 */
export function pipelineProductAnchor(
  product: PipelineProduct,
  preferred: PipelineSystemId | null,
) {
  const order: PipelineSystemId[] = preferred ? [preferred] : ["hot", "cold"];

  for (const systemId of [...order, "hot" as const, "cold" as const]) {
    const [first] = product.elements[systemId];

    if (first) {
      return first;
    }
  }

  return null;
}

/**
 * Revit ids arrive as bracketed suffixes on glTF node names, but three.js
 * sanitizes names on load and drops the brackets ("... [631653]" becomes
 * "..._631653"), so the instance id is whatever digits trail the name.
 */
export function pipelineElementFromNode(name: string): PipelineElement | null {
  const product = matchers.find((candidate) => name.includes(candidate.match));
  const id = /(\d+)$/.exec(name)?.[1];

  if (!product || !id) {
    return null;
  }

  return elementById.get(id) ?? { id, product, system: null };
}
