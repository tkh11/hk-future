import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import DataCenterHero from "@/sections/data-centers/DataCenterHero";

export const metadata: Metadata = {
  title: "Системы охлаждения ЦОД — HEISSKRAFT",
  description: "Как устроено охлаждение центров обработки данных. Интерактивные схемы, насосное оборудование HEISSKRAFT и трубы ClimatFaser для контуров холодоснабжения.",
};

export default function DataCentersPage() {
  return <main>
    <DataCenterHero />
    <DeferredBlock kind="dc-intro" />
    <DeferredBlock kind="dc-loop" />
    <DeferredBlock kind="dc-methods" />
    <DeferredBlock kind="dc-products" />
  </main>;
}
