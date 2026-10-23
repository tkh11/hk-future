import { coolingProducts, fireProducts } from "@/content/solutions";
import Footer from "@/components/layout/Footer";
import HomeHero from "@/sections/home/HomeHero";
import Solutions from "@/sections/home/Solutions";
import DataCenterIntro from "@/sections/data-centers/DataCenterIntro";
import DataCenterProducts from "@/sections/data-centers/DataCenterProducts";
import CoolingExplorer from "@/sections/data-centers/CoolingExplorer";
import FireIntro from "@/sections/fire-suppression/FireIntro";
import FireProducts from "@/sections/fire-suppression/FireProducts";
import FireExplorer from "@/sections/fire-suppression/FireExplorer";
import RevealBlock from "./RevealBlock";

// Composition stays on the server. Only media/viewers defer their own hydration
// and requests; an image failure must never hide a section's copy or links.
const blocks = {
  hero: HomeHero,
  solutions: Solutions,
  footer: Footer,
  "dc-intro": DataCenterIntro,
  "dc-system": () => <CoolingExplorer items={coolingProducts} />,
  "dc-products": DataCenterProducts,
  "fire-intro": FireIntro,
  "fire-system": () => <FireExplorer items={fireProducts} />,
  "fire-products": FireProducts,
};

export default function DeferredBlock({ kind }: { kind: keyof typeof blocks }) {
  const Content = blocks[kind];
  return <RevealBlock kind={kind}><Content /></RevealBlock>;
}
