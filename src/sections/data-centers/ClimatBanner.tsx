"use client";

import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./DataCenters.module.css";

export default function ClimatBanner() {
  const { surfaceRef, pointerHandlers } = usePointerTilt({ trackSheen: true });

  return <div className={styles.climatBannerStage} {...pointerHandlers}>
    <div ref={surfaceRef} className={styles.climatBanner}>
      <Image src={publicPath("/images/data-centers/climatfaser-banner.jpg")} width={1024} height={264} alt="ClimatFaser: труба для холодоснабжения, от −40°C до +95°C" quality={100} unoptimized sizes="(max-width: 767px) 100vw, 1200px" draggable={false} />
    </div>
  </div>;
}
