"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { catalogHref, type CatalogEntry } from "@/lib/catalog";
import { publicPath } from "@/lib/public-path";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./Catalog.module.css";

const CatalogArtwork = dynamic(() => import("./CatalogArtwork"), {
  ssr: false,
  loading: () => <span className={styles.skeleton} aria-hidden="true" />,
});
const coverVideos: Record<string, string> = {
  pipes: "/videos/catalog/pipes.mp4",
  pump: "/videos/catalog/pumpscategory.mp4",
  auxiliary: "/videos/catalog/accessories.mp4",
};

export default function CatalogCard({ entry, showParent = false, cover = false }: { entry: CatalogEntry; showParent?: boolean; cover?: boolean }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt({ trackReflection: true });
  const root = useRef<HTMLLIElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { node, path, trail } = entry;
  const photoBanner = !cover && path[0] === "pipelines" && Boolean(node.image);
  useEffect(() => {
    let inView = false;
    const updatePlayback = () => setPlaying(cover && inView && !document.hidden);
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(item => item.isIntersecting);
      if (inView) setVisible(true);
      updatePlayback();
    }, { rootMargin: "0px", threshold: 0 });
    if (root.current) observer.observe(root.current);
    if (cover) document.addEventListener("visibilitychange", updatePlayback);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", updatePlayback); };
  }, [cover]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (playing && !reducedMotion.matches) void video.play().catch(() => {});
      else video.pause();
    };
    syncPlayback();
    reducedMotion.addEventListener("change", syncPlayback);
    return () => { reducedMotion.removeEventListener("change", syncPlayback); video.pause(); };
  }, [playing, visible]);
  return <li ref={root} className={visible ? "deferred-block__content is-ready" : undefined}>
    <Link href={catalogHref(path)} className={styles.cardLink} {...pointerHandlers}>
      <div ref={surfaceRef} className={`${styles.card}${cover ? ` ${styles.coverCard}` : ""}${photoBanner ? ` ${styles.bannerCard}` : ""}`} data-playing={playing} data-tone={photoBanner ? node.tone : undefined}>
        {cover ? <>
          {visible && <video ref={videoRef} className={styles.coverVideo} src={coverVideos[node.art]} muted loop playsInline preload="metadata" aria-hidden="true" />}
          <h2>{node.title}</h2>
        </> : photoBanner ? <>
          <span className={styles.bannerSizer} aria-hidden="true" />
          {visible ? <img src={publicPath(node.image!)} alt="" width={1024} height={768} className={styles.bannerPhoto} /> : <span className={styles.skeleton} data-idle="true" aria-hidden="true" />}
          <div className={styles.bannerCopy}>
            <h2>{node.title}</h2>
            {showParent && trail.length > 1 && <p>{trail[0].title}</p>}
          </div>
          {node.description && <p className={styles.bannerNote}>{node.description}</p>}
        </> : <>
          <h2>{node.title}</h2>
          {showParent && trail.length > 1 && <p>{trail[0].title}</p>}
          <div className={styles.art}>
            {visible && node.image ? <img src={publicPath(node.image)} alt="" width={1024} height={768} className={styles.photo} /> : visible ? <CatalogArtwork kind={node.art} /> : <span className={styles.skeleton} data-idle="true" aria-hidden="true" />}
          </div>
        </>}
      </div>
    </Link>
  </li>;
}
