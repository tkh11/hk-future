"use client";

import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./FireSuppression.module.css";

export default function FireOffBanner() {
  const { surfaceRef, pointerHandlers } = usePointerTilt({ trackSheen: true });
  return <div className={styles.bannerStage} {...pointerHandlers}>
    <div ref={surfaceRef} className={styles.banner}>
      <div className={styles.bannerCopy}><h2>Fire<span>Off</span></h2><p>Надёжность начинается<br />с соединения.</p></div>
      <Image className={styles.bannerImage} src={publicPath("/images/fire-suppression/pipe.png")} width={1280} height={1024} sizes="(max-width: 767px) 90vw, 600px" alt="Труба FireOff со слоем стекловолокна" />
    </div>
  </div>;
}
