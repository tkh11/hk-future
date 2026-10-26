import Link from "next/link";
import Image from "next/image";
import RevealBlock from "@/components/ui/RevealBlock";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";
import ViewportImage from "@/components/ui/ViewportImage";
import SolutionCard from "@/sections/home/SolutionCard";
import solutionStyles from "@/sections/home/Solutions.module.css";
import { populatedMedia, safeContentHref, type CmsAction, type CmsPageBlock, type MediaReference } from "./types";
import CmsPromoBanner from "./CmsPromoBanner";
import styles from "./CmsBlocks.module.css";

function Paragraphs({ text }: { text?: string | null }) {
  return text?.split(/\n\s*\n/u).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>);
}
function Actions({ actions }: { actions?: CmsAction[] | null }) {
  if (!actions?.length) return null;
  return <div className={styles.actions}>{actions.map((action, index) => {
    const href = safeContentHref(action.href);
    return href ? <Link key={action.id ?? index} href={href}>{action.label}</Link> : null;
  })}</div>;
}
function Media({ image, eager = false }: { image?: MediaReference; eager?: boolean }) {
  const media = populatedMedia(image);
  if (!media?.url) return <div className={`${styles.media} ${styles.placeholder}`}><MediaPlaceholder /></div>;
  const props = { src: media.url, width: media.width ?? 1200, height: media.height ?? 800, alt: media.alt ?? "", sizes: "(max-width: 767px) 100vw, 1280px" };
  return <div className={styles.media}>{eager ? <Image unoptimized src={media.url} width={props.width} height={props.height} sizes={props.sizes} loading="eager" fetchPriority="high" alt={props.alt} /> : <ViewportImage {...props} />}</div>;
}

function Block({ block }: { block: CmsPageBlock }) {
  switch (block.blockType) {
    case "hero": return <section className={`${styles.section} ${styles.hero} ${styles.split}`} data-header-theme="light"><div className={styles.copy}><h1>{block.heading}</h1><Paragraphs text={block.description} /><Actions actions={block.actions} /></div><Media image={block.image} eager /></section>;
    case "text": return <section className={styles.section}><div className={styles.reading}>{block.heading && <h2>{block.heading}</h2>}<Paragraphs text={block.text} /></div></section>;
    case "imageText": {
      const copy = <div className={styles.copy}><h2>{block.heading}</h2><Paragraphs text={block.text} /><Actions actions={block.actions} /></div>;
      return <section className={`${styles.section} ${styles.split}`}>{block.imageSide === "right" ? <>{copy}<Media image={block.image} /></> : <><Media image={block.image} />{copy}</>}</section>;
    }
    case "categories": return <section className={styles.section} aria-label={block.heading ?? "Разделы"}>{block.heading && <h2>{block.heading}</h2>}<ul className={solutionStyles.grid}>{block.items.map((item, index) => {
      const href = safeContentHref(item.href);
      if (!href) return null;
      const media = populatedMedia(item.image);
      return <li key={item.id ?? index}><SolutionCard href={href}><div className={solutionStyles.media}>{media?.url ? <Image unoptimized className={solutionStyles.image} src={media.url} width={media.width ?? 1024} height={media.height ?? 1024} alt={media.alt ?? ""} loading="lazy" /> : <MediaPlaceholder />}</div><h3 className={solutionStyles.title}>{item.title}</h3></SolutionCard></li>;
    })}</ul></section>;
    case "promoBanner": return <section className={styles.section}><CmsPromoBanner href={safeContentHref(block.href)} sheen={block.sheen}><Media image={block.image} /></CmsPromoBanner></section>;
    case "modelDescriptions": return <section className={styles.section} aria-label={block.heading ?? "Элементы системы"}>{block.heading && <h2>{block.heading}</h2>}<div className={styles.descriptionGrid}>{block.items.map(item => <article key={item.element} className={styles.description} data-model-element={item.element}><Media image={item.image} /><h3>{item.title}</h3><Paragraphs text={item.text} />{item.href && <Actions actions={[{ label: "В каталог", href: item.href }]} />}</article>)}</div></section>;
    case "cta": return <section className={`${styles.section} ${styles.cta}`}><h2>{block.heading}</h2><div className={styles.reading}><Paragraphs text={block.text} /></div><Actions actions={block.actions} /></section>;
  }
}

export default function CmsBlocks({ blocks }: { blocks: CmsPageBlock[] }) {
  return blocks.filter(block => !block.hidden).map((block, index) => block.blockType === "hero"
    ? <Block key={block.id ?? index} block={block} />
    : <RevealBlock key={block.id ?? index} kind="content"><Block block={block} /></RevealBlock>);
}
