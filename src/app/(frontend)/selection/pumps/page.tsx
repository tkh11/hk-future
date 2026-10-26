import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";

const defaultMetadata: Metadata = {
  title: "Подбор насосов — HEISSKRAFT",
  description: "Подбор насосного оборудования HEISSKRAFT.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/selection/pumps", defaultMetadata);
}

function PumpSelectionPage() {
  return <main><section data-header-theme="light" className="page-stub"><div className="page-stub__inner"><h1 className="page-stub__title">Подбор насосов</h1></div></section></main>;
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/selection/pumps"><PumpSelectionPage /></CMSPageOverride>;
}
