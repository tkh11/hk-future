"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./Solutions.module.css";

export default function SolutionCard({ href, children }: { href: string; children: ReactNode }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt();

  return (
    <Link href={href} className={styles.cardLink} {...pointerHandlers}>
      <div ref={surfaceRef} className={styles.card}>{children}</div>
    </Link>
  );
}
