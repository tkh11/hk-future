"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./CmsBlocks.module.css";

export default function CmsPromoBanner({ href, sheen, children }: { href?: string; sheen?: "neutral" | "green" | "red" | null; children: ReactNode }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt({ trackSheen: true });
  const surface = <div ref={surfaceRef} className={styles.banner} data-tone={sheen ?? "neutral"}>{children}</div>;
  return <div className={styles.bannerStage} {...pointerHandlers}>{href ? <Link className={styles.bannerLink} href={href}>{surface}</Link> : surface}</div>;
}
