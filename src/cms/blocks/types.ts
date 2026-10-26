/** Public, serializable CMS content. Scene geometry and executable markup are deliberately absent. */
export interface CmsMedia {
  id?: number | string;
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
}
export type MediaReference = CmsMedia | number | string | null;
export interface CmsAction { label: string; href: string; id?: string | null }
interface BaseBlock { id?: string | null; blockName?: string | null; hidden?: boolean | null }
export interface HeroBlock extends BaseBlock {
  blockType: "hero"; heading: string; description?: string | null; image?: MediaReference;
  actions?: CmsAction[] | null;
}
export interface TextBlock extends BaseBlock { blockType: "text"; heading?: string | null; text: string }
export interface CategoriesBlock extends BaseBlock {
  blockType: "categories"; heading?: string | null;
  items: { title: string; href: string; image?: MediaReference; id?: string | null }[];
}
export interface ImageTextBlock extends BaseBlock {
  blockType: "imageText"; heading: string; text: string; image?: MediaReference;
  imageSide?: "left" | "right" | null; actions?: CmsAction[] | null;
}
export interface PromoBannerBlock extends BaseBlock {
  blockType: "promoBanner"; image?: MediaReference; href?: string | null;
  sheen?: "neutral" | "green" | "red" | null;
}
export interface ModelDescriptionsBlock extends BaseBlock {
  blockType: "modelDescriptions"; heading?: string | null; model: "data-centers" | "fire-suppression";
  items: {
    element: "pipes" | "pumps" | "valves" | "station" | "pipework" | "sprinkler" | "hydrants" | "flange";
    title: string; text: string; image?: MediaReference; href?: string | null; id?: string | null;
  }[];
}
export interface CtaBlock extends BaseBlock {
  blockType: "cta"; heading: string; text?: string | null; actions: CmsAction[];
}
export type CmsPageBlock = HeroBlock | TextBlock | CategoriesBlock | ImageTextBlock | PromoBannerBlock | ModelDescriptionsBlock | CtaBlock;

export function safeContentHref(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || /[\s\\\u0000-\u001f]/u.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? value : undefined; }
  catch { return undefined; }
}

export function populatedMedia(value: MediaReference | undefined): CmsMedia | undefined {
  if (!value || typeof value !== "object" || !safeContentHref(value.url)) return undefined;
  // An unpublished, unpopulated, or deleted relation remains a local placeholder.
  return value;
}
