"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { catalogHref, type CatalogEntry } from "@/lib/catalog";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./Catalog.module.css";

const CatalogArtwork = dynamic(() => import("./CatalogArtwork"), {
  ssr: false,
  loading: () => <span className={styles.skeleton} aria-hidden="true" />,
});

export default function CatalogCard({ entry, showParent = false }: { entry: CatalogEntry; showParent?: boolean }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt();
  const root = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);
  const { node, path, trail } = entry;
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(item => item.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "0px", threshold: 0 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <li ref={root} className={visible ? "deferred-block__content is-ready" : undefined}>
    <Link href={catalogHref(path)} className={styles.cardLink} {...pointerHandlers}>
      <div ref={surfaceRef} className={styles.card}>
        <h2>{node.title}</h2>
        {showParent && trail.length > 1 ? <p>{trail[0].title}</p> : node.children && <p>{node.children.length} {node.slug === "pipelines" ? "систем" : "категорий"}</p>}
        <div className={styles.art}>
          {visible ? <CatalogArtwork kind={node.art} /> : <span className={styles.skeleton} data-idle="true" aria-hidden="true" />}
        </div>
      </div>
    </Link>
  </li>;
}
