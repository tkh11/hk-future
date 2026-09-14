export type BuildingBlockId = "typical-floor" | "utility-node" | "parking";

export type BuildingBlock = {
  id: BuildingBlockId;
  index: string;
  title: string;
  note: string;
  /** Blocks without a detail model only highlight on the facade. */
  model: string | null;
};

/**
 * Vertical extent of every block in facade.glb, in metres. The Revit levels put
 * the two parking decks at −7…0, the entrance floors at 0…3.3, then 23 typical
 * floors on a 3.3 m pitch up to 82.1, and the technical floor above that.
 * The entrance floors belong to no block — they stay as neutral context.
 */
export const BUILDING_BLOCK_RANGES: Record<BuildingBlockId, [number, number]> = {
  parking: [Number.NEGATIVE_INFINITY, 0],
  "typical-floor": [3.3, 82.1],
  "utility-node": [82.1, Number.POSITIVE_INFINITY],
};

export const BUILDING_BLOCKS: BuildingBlock[] = [
  {
    id: "typical-floor",
    index: "01",
    title: "Типовой этаж",
    note: "Разводка ХВС и ГВС в квартире: стояки, поэтажные подводки, подключение приборов.",
    model: "/models/communications.glb",
  },
  {
    id: "utility-node",
    index: "02",
    title: "Инженерный узел",
    note: "Технический этаж над жилыми уровнями. Модель узла в подготовке.",
    model: null,
  },
  {
    id: "parking",
    index: "03",
    title: "Подземный паркинг",
    note: "Два подземных уровня. Модель в подготовке.",
    model: null,
  },
];

const byId = new Map(BUILDING_BLOCKS.map((block) => [block.id, block]));

export function findBuildingBlock(id: BuildingBlockId | null) {
  return id ? (byId.get(id) ?? null) : null;
}

/** Assigns a facade mesh to a block by the height of its centre. */
export function buildingBlockIdForHeight(height: number): BuildingBlockId | null {
  for (const block of BUILDING_BLOCKS) {
    const [from, to] = BUILDING_BLOCK_RANGES[block.id];

    if (height >= from && height < to) {
      return block.id;
    }
  }

  return null;
}
