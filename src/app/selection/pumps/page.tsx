import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Подбор насосов — HEISSKRAFT",
  description: "Подбор насосного оборудования HEISSKRAFT.",
};

function PumpSelectionPage() {
  return <main><section data-header-theme="light" className="page-stub"><div className="page-stub__inner"><h1 className="page-stub__title">Подбор насосов</h1></div></section></main>;
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/selection/pumps"><PumpSelectionPage /></CMSPageOverride>;
}
