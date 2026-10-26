import { z } from "zod";
import { safeContentHref, type CmsPageBlock } from "./types";

const shortText = z.string().max(160);
const optionalText = z.string().max(12000).nullish();
const href = z.string().max(2048).refine(value => Boolean(safeContentHref(value)));
const media = z.union([
  z.object({ id: z.union([z.string(), z.number()]).optional(), url: href.nullish(), alt: z.string().max(600).nullish(), width: z.number().positive().max(50000).nullish(), height: z.number().positive().max(50000).nullish(), mimeType: z.string().max(100).nullish() }),
  z.string(), z.number(), z.null(),
]).optional();
const common = { id: z.string().nullish(), blockName: z.string().max(160).nullish(), hidden: z.boolean().nullish() };
const action = z.object({ id: z.string().nullish(), label: z.string().min(1).max(80), href });
const actions = z.array(action).max(2).nullish();
const blockSchema = z.discriminatedUnion("blockType", [
  z.object({ ...common, blockType: z.literal("hero"), heading: shortText, description: z.string().max(600).nullish(), image: media, actions }),
  z.object({ ...common, blockType: z.literal("text"), heading: shortText.nullish(), text: z.string().max(12000) }),
  z.object({ ...common, blockType: z.literal("categories"), heading: shortText.nullish(), items: z.array(z.object({ id: z.string().nullish(), title: shortText, href, image: media })).max(12) }),
  z.object({ ...common, blockType: z.literal("imageText"), heading: shortText, text: z.string().max(12000), image: media, imageSide: z.enum(["left", "right"]).nullish(), actions }),
  z.object({ ...common, blockType: z.literal("promoBanner"), image: media, href: href.or(z.literal("")).nullish(), sheen: z.enum(["neutral", "green", "red"]).nullish() }),
  z.object({ ...common, blockType: z.literal("modelDescriptions"), heading: shortText.nullish(), model: z.enum(["data-centers", "fire-suppression"]), items: z.array(z.object({ id: z.string().nullish(), element: z.enum(["pipes", "pumps", "valves", "station", "pipework", "sprinkler", "hydrants", "flange"]), title: shortText, text: z.string().max(12000), image: media, href: href.or(z.literal("")).nullish() })).max(8) }),
  z.object({ ...common, blockType: z.literal("cta"), heading: shortText, text: optionalText, actions: z.array(action).min(1).max(2) }),
]);

/** Drops unknown blocks and private fields rather than serializing Payload documents to clients. */
export function parsePublicBlocks(value: unknown): CmsPageBlock[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap(candidate => {
    const parsed = blockSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.hidden) return [];
    const block = parsed.data;
    if (block.blockType === "modelDescriptions") {
      const valid = block.model === "data-centers" ? ["pipes", "pumps", "valves"] : ["station", "pipework", "sprinkler", "hydrants", "flange"];
      block.items = block.items.filter((item, index, items) => valid.includes(item.element) && items.findIndex(other => other.element === item.element) === index);
    }
    return [block];
  });
}
