import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import DataCenterHero from "@/sections/data-centers/DataCenterHero";

const defaultMetadata: Metadata = {
  title: "Системы охлаждения ЦОД — HEISSKRAFT",
  description: "Как устроено охлаждение центров обработки данных. Интерактивная модель, насосное оборудование HEISSKRAFT и трубы ClimatFaser для контуров холодоснабжения.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/solutions/data-centers", defaultMetadata);
}

function DataCentersPage() {
  return <main>
    <DataCenterHero />
    <DeferredBlock kind="dc-intro" />
    <DeferredBlock kind="dc-system" />
    <DeferredBlock kind="dc-products" />
  </main>;
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/solutions/data-centers"><DataCentersPage /></CMSPageOverride>;
}
