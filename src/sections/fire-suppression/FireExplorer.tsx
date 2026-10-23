"use client";

import Image from "next/image";
import Link from "next/link";
import { createRetryableModel } from "@/components/models/createRetryableModel";
import ModelFailure from "@/components/ui/ModelFailure";
import ViewportMount from "@/components/ui/ViewportMount";
import { useEffect, useRef, useState } from "react";
import { publicPath } from "@/lib/public-path";
import { scrollPageTo } from "@/lib/page-scroll";
import ModelHelp from "@/components/models/ModelHelp";
import styles from "../data-centers/CoolingExplorer.module.css";
import fireStyles from "./FireExplorer.module.css";
import type { FireSelection } from "./fireoff-model";
import type { ProductDescription } from "@/content/types";

const FireOffViewer = createRetryableModel(() => import("./FireOffViewer"), {
  loading: () => <div className={styles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы FireOff</div></div>,
  fallback: retry => <div className={fireStyles.viewer}><ModelFailure onRetry={retry} /></div>,
});
export default function FireExplorer({ items }: { items: ProductDescription<NonNullable<FireSelection>>[] }) {
  const [selection, setSelection] = useState<FireSelection>(null);
  const visual = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(([entry]) => {
      screen.current?.style.setProperty("--fire-panel-height", `${entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height}px`);
    });
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  function select(next: FireSelection) {
    setSelection(next);
    const bounds = visual.current?.getBoundingClientRect();
    if (!bounds) return;
    const top = (document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 44) + 12;
    // Keep the camera transition in view, including when choosing from the mobile list.
    if (bounds.top < top || bounds.bottom > window.innerHeight - 12) {
      scrollPageTo(Math.max(0, window.scrollY + bounds.top - top));
    }
  }
  return <section id="fireoff-system" className={styles.section} aria-labelledby="fireoff-system-title" data-header-theme="light">
    <div className={styles.heading}><h2 id="fireoff-system-title">FireOff. Система в деталях.</h2><p>Выберите элемент — камера плавно перейдёт от общего вида паркинга к нужному узлу.</p></div>
    <div className={styles.layout}>
      <div ref={visual} className={styles.visual} onKeyDown={event => { if (event.key === "Escape") select(null); }}>
        <div ref={screen} className={fireStyles.screen}>
          <ViewportMount fallback={<div className={fireStyles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы FireOff</div></div>}><FireOffViewer selection={selection} onSelect={select} labels={Object.fromEntries(items.map(({ id, label }) => [id, label]))} /></ViewportMount>
          <div ref={panel} className={fireStyles.panel} role="group" aria-label="Элементы системы FireOff" data-lenis-prevent>
            {items.map((item, index) => {
              const expanded = selection === item.id;
              return <article key={item.id} className={fireStyles.card} data-expanded={expanded}>
                <button id={`fireoff-toggle-${item.id}`} type="button" aria-expanded={expanded} aria-controls={`fireoff-detail-${item.id}`} className={fireStyles.option} onClick={() => select(expanded ? null : item.id)}>
                  <span className={fireStyles.number}>0{index + 1}</span><strong>{item.label}</strong>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m5 6 3 3 3-3" /></svg>
                </button>
                <div id={`fireoff-detail-${item.id}`} className={fireStyles.disclosure} role="region" aria-labelledby={`fireoff-toggle-${item.id}`} aria-hidden={!expanded} inert={!expanded}>
                  <div className={fireStyles.disclosureClip}><div className={fireStyles.productContent}>
                    <div className={`${fireStyles.productImage} ${item.image.endsWith('.svg') ? fireStyles.placeholder : ""}`}><Image src={publicPath(item.image)} width={1024} height={1024} sizes="(max-width: 767px) 260px, 240px" alt={item.alt} /></div>
                    <h3>{item.title}</h3><p>{item.text}</p>
                    <Link href="/catalog" className={`home-hero__link ${fireStyles.catalogLink}`} aria-label={`${item.label} — перейти в каталог`}>В каталог</Link>
                  </div></div>
                </div>
              </article>;
            })}
          </div>
        </div>
        <div className={styles.modelFooter}>
          <button type="button" className={fireStyles.overview} onClick={() => select(null)} aria-pressed={!selection}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /><rect x="8" y="8" width="8" height="8" rx="1" /></svg>
            Общий вид
          </button>
          <div className={styles.legend} aria-live="polite"><span>{selection && <i className={styles.red} />}{items.find(item => item.id === selection)?.label ?? "Система пожаротушения паркинга"}</span></div>
          <ModelHelp cameraViews />
        </div>
      </div>
    </div>
  </section>;
}
