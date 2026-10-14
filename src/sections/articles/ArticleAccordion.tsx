"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import type { ArticleSummary } from "@/lib/articles";
import { publicPath } from "@/lib/public-path";
import styles from "./Articles.module.css";

gsap.registerPlugin(SplitText, CustomEase);
CustomEase.create("article-reveal", "0.625, 0.05, 0, 1");

const previews: Record<string, string> = {
  Арматура: "/images/data-centers/valve.jpg",
  Трубы: "/images/catalog/therm.jpg",
  Насосы: "/images/data-centers/pump.jpg",
  Водоснабжение: "/hero-products/pump-station.jpg",
  Отопление: "/images/catalog/multilayer.jpg",
};

function ArticleEntry({ article, expanded, active, onToggle, onPreview }: {
  article: ArticleSummary;
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const copy = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!expanded || !copy.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let split: SplitText | undefined;
    let cancelled = false;
    const revert = () => { split?.revert(); split = undefined; };
    document.fonts.ready.then(() => {
      if (cancelled || reduced.matches || !copy.current) return;
      split = SplitText.create(copy.current, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: self => gsap.fromTo(self.lines,
          { opacity: 0, yPercent: 110 },
          { opacity: 1, yPercent: 0, duration: 0.48, delay: 0.18, stagger: 0.045, ease: "article-reveal" }),
      });
    });
    reduced.addEventListener("change", revert);
    return () => { cancelled = true; revert(); reduced.removeEventListener("change", revert); };
  }, [expanded]);

  return <article className={styles.accordionEntry} data-article-slug={article.slug} data-active={active} data-expanded={expanded}>
    <h2 className={styles.accordionHeading}>
      <button id={`article-toggle-${article.slug}`} type="button" className={styles.articleToggle}
        aria-expanded={expanded} aria-controls={`article-panel-${article.slug}`}
        onClick={onToggle} onPointerEnter={event => { if (event.pointerType !== "touch") onPreview(); }} onFocus={onPreview}>
        <span>{article.title}</span><span className={styles.toggleMark} aria-hidden="true" />
      </button>
    </h2>
    <div id={`article-panel-${article.slug}`} className={styles.articlePanel} role="region"
      aria-labelledby={`article-toggle-${article.slug}`} aria-hidden={!expanded} inert={!expanded}>
      <div className={styles.articlePanelClip}>
        <div className={styles.articlePanelContent}>
          <p className={styles.meta}>{article.category} · {article.readingMinutes} мин чтения</p>
          <p ref={copy} className={styles.articleDescription}>{article.description}</p>
          <Link href={`/articles/${article.slug}`} className={styles.readArticle}>Читать статью</Link>
        </div>
      </div>
    </div>
  </article>;
}

export default function ArticleAccordion({ articles }: { articles: ArticleSummary[] }) {
  const [expanded, setExpanded] = useState<string | null>(articles[0]?.slug ?? null);
  const [hovered, setHovered] = useState(articles[0]?.slug ?? "");
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const activeSlug = expanded ?? hovered;
  const activeArticle = articles.find(article => article.slug === activeSlug) ?? articles[0];
  const image = previews[activeArticle?.category] ?? previews.Трубы;

  useEffect(() => {
    const container = root.current;
    const visual = preview.current;
    if (!container || !visual) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    let frame = 0;
    let target = 0;
    let current = Number(visual.dataset.position ?? 0);
    const move = () => {
      frame = 0;
      if (document.hidden || mobile.matches) return;
      current = reduced.matches ? target : current + (target - current) * 0.055;
      if (Math.abs(target - current) < 0.35) current = target;
      visual.style.transform = `translate3d(0, ${current}px, 0)`;
      visual.dataset.position = String(current);
      if (current !== target) frame = requestAnimationFrame(move);
    };
    const measure = () => {
      if (mobile.matches || document.hidden) { cancelAnimationFrame(frame); frame = 0; return; }
      const entry = Array.from(container.querySelectorAll<HTMLElement>("[data-article-slug]"))
        .find(element => element.dataset.articleSlug === activeSlug);
      const button = entry?.querySelector("button");
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      target = Math.max(0, Math.min(container.offsetHeight - visual.offsetHeight,
        bounds.top - container.getBoundingClientRect().top + bounds.height / 2 - visual.offsetHeight / 2));
      if (!frame) frame = requestAnimationFrame(move);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll("[data-article-slug]").forEach(element => observer.observe(element));
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    reduced.addEventListener("change", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
      reduced.removeEventListener("change", measure);
    };
  }, [activeSlug]);

  return <div ref={root} className={styles.accordionLayout}>
    <div className={styles.accordionList}>
      {articles.map(article => <ArticleEntry key={article.slug} article={article}
        expanded={expanded === article.slug} active={hovered === article.slug || expanded === article.slug}
        onPreview={() => setHovered(article.slug)}
        onToggle={() => { setHovered(article.slug); setExpanded(current => current === article.slug ? null : article.slug); }} />)}
    </div>
    <div className={styles.articleVisual} aria-hidden="true">
      <div ref={preview} className={styles.articlePreview}>
        {Object.values(previews).map(src => <Image key={src} src={publicPath(src)} alt="" fill
          sizes="(max-width: 767px) 1px, (max-width: 1024px) 26vw, 320px"
          className={styles.previewImage} data-active={image === src} />)}
      </div>
    </div>
  </div>;
}
