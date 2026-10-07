"use client";

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const blocks = {
  hero: lazy(() => import("@/sections/home/HomeHero")),
  solutions: lazy(() => import("@/sections/home/Solutions")),
  footer: lazy(() => import("@/components/layout/Footer")),
  "dc-intro": lazy(() => import("@/sections/data-centers/DataCenterIntro")),
  "dc-loop": lazy(() => import("@/sections/data-centers/CoolingExplorer").then(module => ({ default: module.CoolingLoop }))),
  "dc-methods": lazy(() => import("@/sections/data-centers/CoolingExplorer").then(module => ({ default: module.CoolingMethods }))),
  "dc-products": lazy(() => import("@/sections/data-centers/DataCenterProducts")),
};
type Kind = keyof typeof blocks;

export function BlockSkeleton({ kind }: { kind: Kind }) {
  if (kind === "hero") return <div className="block-skeleton block-skeleton--hero" role="status" aria-label="Загрузка блока о компании">
    <div className="block-skeleton__shapes" aria-hidden="true">
      <div className="block-skeleton__company-copy">
        <span className="block-skeleton__company-heading" />
        <span className="block-skeleton__company-description" />
        <span className="block-skeleton__company-text" />
        <span className="block-skeleton__company-actions"><span /><span /></span>
      </div>
      <span className="block-skeleton__media" />
    </div>
  </div>;
  return <div className={`block-skeleton block-skeleton--${kind}`} role="status" aria-label="Загрузка блока">
    {kind === "solutions" && <div className="block-skeleton__banner" aria-hidden="true">
      <span className="block-skeleton__line" />
      <span className="block-skeleton__line block-skeleton__line--short" />
      <span className="block-skeleton__banner-copy" />
      <span className="block-skeleton__banner-actions" />
    </div>}
    <div className="block-skeleton__shapes" aria-hidden="true">
      {Array.from({ length: kind === "solutions" ? 6 : kind === "footer" ? 4 : kind === "dc-intro" || kind === "dc-products" ? 2 : 1 }, (_, index) => (
        <div className="block-skeleton__item" key={index}>
          <span className="block-skeleton__media" />
          <span className="block-skeleton__line" />
          <span className="block-skeleton__line block-skeleton__line--short" />
        </div>
      ))}
    </div>
  </div>;
}

class BlockError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="block-load-error" role="alert">
      <p>Не удалось загрузить блок.</p>
      <button className="home-hero__link" onClick={() => window.location.reload()}>Повторить загрузку</button>
    </div> : this.props.children;
  }
}

function LoadedBlock({ kind }: { kind: Kind }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const images = [...root.querySelectorAll("img")].filter(image => getComputedStyle(image).display !== "none");
    // The block has entered the viewport: fetch all its images, including lower rows.
    images.forEach(image => { image.loading = "eager"; });
    const posters = [...root.querySelectorAll("video[poster]")].map(video => {
      const image = new window.Image();
      image.src = video.getAttribute("poster")!;
      return image;
    });
    const pending = [...images, ...posters].map(image => new Promise<void>(resolve => {
      if (image.complete) { resolve(); return; }
      const done = () => { image.removeEventListener("load", done); image.removeEventListener("error", done); resolve(); };
      image.addEventListener("load", done);
      image.addEventListener("error", done);
      cleanups.push(done);
    }));
    Promise.all(pending).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; cleanups.forEach(cleanup => cleanup()); };
  }, []);
  const Content = blocks[kind];
  return <>
    {!ready && <BlockSkeleton kind={kind} />}
    <div ref={ref} className={`deferred-block__content${ready ? " is-ready" : ""}`} aria-hidden={!ready} inert={!ready}>
      <Content />
    </div>
  </>;
}

export default function DeferredBlock({ kind }: { kind: Kind }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px", threshold: 0 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`deferred-block deferred-block--${kind}`} data-header-theme="light">
    {visible ? <BlockError><Suspense fallback={<BlockSkeleton kind={kind} />}><LoadedBlock kind={kind} /></Suspense></BlockError> : <BlockSkeleton kind={kind} />}
  </div>;
}
