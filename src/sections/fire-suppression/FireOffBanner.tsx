"use client";

import ViewportImage from "@/components/ui/ViewportImage";
import { publicPath } from "@/lib/public-path";
import { usePointerTilt } from "@/lib/use-pointer-tilt";
import styles from "./FireSuppression.module.css";

const banners = {
  fireoff: { src: "/images/fire-suppression/fireoff-cover.png", width: 2172, height: 724, alt: "HEISSKRAFT FireOff — трубы и фитинги для систем пожаротушения" },
  boost: { src: "/images/fire-suppression/hk-boost-banner.jpg", width: 6409, height: 1276, alt: "HEISSKRAFT HK-Boost — насосные станции и системы управления" },
} as const;

function ProductBanner({ kind }: { kind: keyof typeof banners }) {
  const { surfaceRef, pointerHandlers } = usePointerTilt({ trackSheen: true });
  const banner = banners[kind];
  return <div className={styles.bannerStage} data-product-banner={kind} {...pointerHandlers}>
    <div ref={surfaceRef} className={styles.banner}>
      <ViewportImage className={styles.bannerImage} src={publicPath(banner.src)} width={banner.width} height={banner.height} sizes="(max-width: 767px) 100vw, 1440px" alt={banner.alt} />
    </div>
  </div>;
}

export default function FireOffBanner() {
  return <ProductBanner kind="fireoff" />;
}

export function HKBoostBanner() {
  return <ProductBanner kind="boost" />;
}
