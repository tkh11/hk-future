import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";

const defaultMetadata: Metadata = {
  title: "Подбор трубопровода — HEISSKRAFT",
  description: "Подбор трубопроводной системы HEISSKRAFT.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/selection/pipelines", defaultMetadata);
}

function PipelineSelectionPage() {
  return <main><section data-header-theme="light" className="page-stub"><div className="page-stub__inner"><h1 className="page-stub__title">Подбор трубопровода</h1></div></section></main>;
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/selection/pipelines"><PipelineSelectionPage /></CMSPageOverride>;
}
