"use client";

import Image from "next/image";
import { useState } from "react";
import ViewportMount from "./ViewportMount";
import styles from "./ViewportImage.module.css";

type Props = { src: string; width: number; height: number; alt: string; sizes: string; className?: string };

/** Native image lazy loading can fetch several screens ahead. Large banners wait for their own viewport. */
export default function ViewportImage(props: Props) {
  const [ready, setReady] = useState(false);
  const placeholder = <span className={styles.placeholder} aria-hidden="true" />;
  return <div className={styles.frame} style={{ aspectRatio: `${props.width} / ${props.height}` }}>
    <ViewportMount fallback={<>{placeholder}<noscript><Image {...props} alt={props.alt} unoptimized draggable={false} /></noscript></>}>
      <Image {...props} alt={props.alt} unoptimized draggable={false} loading="eager" onLoad={() => setReady(true)} onError={() => setReady(true)} />
      {!ready && placeholder}
    </ViewportMount>
  </div>;
}
