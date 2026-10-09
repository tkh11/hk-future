"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import styles from "./DataCenters.module.css";

const HOVER_MOTION = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export default function ClimatBanner() {
  const banner = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 50, y: 50 });

  const stopFollowing = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (banner.current) banner.current.dataset.hovered = "false";
  }, []);

  useEffect(() => {
    const motion = window.matchMedia(HOVER_MOTION);
    motion.addEventListener("change", stopFollowing);
    window.addEventListener("blur", stopFollowing);
    return () => {
      cancelAnimationFrame(frame.current);
      motion.removeEventListener("change", stopFollowing);
      window.removeEventListener("blur", stopFollowing);
    };
  }, [stopFollowing]);

  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !window.matchMedia(HOVER_MOTION).matches) return;
    // Measure the stationary wrapper so the tilt never feeds back into pointer coordinates.
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.current = {
      x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)),
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (!banner.current) return;
      banner.current.style.setProperty("--sheen-x", `${pointer.current.x}%`);
      banner.current.style.setProperty("--sheen-y", `${pointer.current.y}%`);
      banner.current.style.setProperty("--tilt-x", `${(50 - pointer.current.y) / 10}deg`);
      banner.current.style.setProperty("--tilt-y", `${(pointer.current.x - 50) / 16}deg`);
      banner.current.dataset.hovered = "true";
    });
  }

  return <div className={styles.climatBannerStage} onPointerEnter={followPointer} onPointerMove={followPointer} onPointerLeave={stopFollowing} onPointerCancel={stopFollowing}>
    <div ref={banner} className={styles.climatBanner}>
      <Image src={publicPath("/images/data-centers/climatfaser-banner.jpg")} width={1024} height={264} alt="ClimatFaser: труба для холодоснабжения, от −40°C до +95°C" quality={100} unoptimized sizes="(max-width: 767px) 100vw, 1200px" draggable={false} />
    </div>
  </div>;
}
