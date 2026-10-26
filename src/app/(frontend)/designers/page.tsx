import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";
import PipelineViewer from "@/sections/designers/PipelineViewer";

const defaultMetadata: Metadata = {
  title: "Проектировщикам — HEISSKRAFT",
  description:
    "Интерактивная 3D-модель здания с трубопроводом HEISSKRAFT: выберите элемент и откройте его описание.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/designers", defaultMetadata);
}

function DesignersPage() {
  return (
    <main>
      <PipelineViewer />
    </main>
  );
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/designers"><DesignersPage /></CMSPageOverride>;
}
